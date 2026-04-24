import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { createHash, randomBytes, scryptSync } from 'crypto';
import * as path from 'path';

import { config as loadEnv } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Seed runs with cwd=packages/database. Load the API's env files explicitly
// so CLOUDINARY_* + DATABASE_URL are available without a root .env.
loadEnv({ path: path.resolve(__dirname, '../../../apps/api/.env.local') });
loadEnv({ path: path.resolve(__dirname, '../../../apps/api/.env') });

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Cloudinary upload helper — idempotent, deterministic public_ids.
//
// Given a source URL (Unsplash or any reachable http(s) URL), uploads it to
// Cloudinary under `ecommerce/<folder>/<sha1-12>` with WebP conversion,
// quality-auto compression, and a 2000px size cap. Returns the Cloudinary
// secure_url, or — on failure — the original source URL so seeding still
// completes. Uses `api.resource` first to avoid re-uploading on re-seed.
// ---------------------------------------------------------------------------

const CLOUDINARY_READY =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_READY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const CLOUDINARY_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce';
const uploadCache = new Map<string, string>();

function publicIdFor(sourceUrl: string, folder: string): string {
  const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12);
  return `${CLOUDINARY_FOLDER}/${folder}/${hash}`;
}

export async function seedImage(sourceUrl: string, folder: string): Promise<string> {
  if (!CLOUDINARY_READY) return sourceUrl;

  const cached = uploadCache.get(sourceUrl);
  if (cached) return cached;

  const publicId = publicIdFor(sourceUrl, folder);
  try {
    // Fast path: the asset already exists from a previous seed run.
    const existing = (await cloudinary.api
      .resource(publicId, { resource_type: 'image' })
      .catch(() => null)) as { secure_url?: string } | null;
    if (existing?.secure_url) {
      uploadCache.set(sourceUrl, existing.secure_url);
      return existing.secure_url;
    }

    const result = await cloudinary.uploader.upload(sourceUrl, {
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
      eager: [
        { width: 150, crop: 'limit', format: 'webp', quality: 80 },
        { width: 600, crop: 'limit', format: 'webp', quality: 85 },
        { width: 1200, crop: 'limit', format: 'webp', quality: 90 },
      ],
    });
    uploadCache.set(sourceUrl, result.secure_url);
    return result.secure_url;
  } catch (err) {
    console.warn(
      `  ✗ Cloudinary upload failed for ${sourceUrl}: ${(err as Error).message}. Using source URL.`,
    );
    uploadCache.set(sourceUrl, sourceUrl);
    return sourceUrl;
  }
}

/** Bulk variant — uploads a list in parallel, preserving order. */
export async function seedImages(sourceUrls: string[], folder: string): Promise<string[]> {
  return Promise.all(sourceUrls.map((u) => seedImage(u, folder)));
}

/**
 * For a Cloudinary `secure_url`, inject a width-limited transformation so the
 * returned URL delivers a ~400px thumbnail. Non-Cloudinary URLs are passed
 * through unchanged (happens when CLOUDINARY_READY is false or upload fails
 * and we fell back to the source URL).
 */
export function toThumbnailUrl(url: string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/w_400,c_limit,f_auto,q_auto/');
}

// ---------------------------------------------------------------------------
// Utility: Password hashing compatible with bcrypt.
//
// We dynamically load bcrypt (which the API uses) so the seed password can
// be verified by the auth service.  If the native bcrypt module isn't
// reachable from the database package we fall back to a compatible hash.
// ---------------------------------------------------------------------------
let hashPassword: (password: string) => Promise<string>;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcrypt');
  hashPassword = (password: string) => bcrypt.hash(password, 10);
} catch {
  // Fallback: produce a bcrypt-compatible $2b$ hash is not possible without
  // the native module, so use a simple scrypt-based hash instead.  This path
  // should not be hit in the monorepo because bcrypt is hoisted.
  hashPassword = async (password: string) => {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  };
}

// ---------------------------------------------------------------------------
// Seed: Super Admin User
// ---------------------------------------------------------------------------
async function seedAdminUser() {
  console.log('Seeding super admin user...');

  const hashedPw = await hashPassword('Admin@ShopBD2025!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shopbd.com' },
    update: {
      password: hashedPw,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      email: 'admin@shopbd.com',
      password: hashedPw,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+8801700000000',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log(`  Created admin: ${admin.email} (${admin.id})`);
  return admin;
}

// ---------------------------------------------------------------------------
// Seed: Categories with Bengali names and hierarchy
// ---------------------------------------------------------------------------
interface CategorySeed {
  name: string;
  nameBn: string;
  slug: string;
  icon?: string;
  description?: string;
  descriptionBn?: string;
  children?: Omit<CategorySeed, 'children'>[];
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Electronics',
    nameBn: 'ইলেকট্রনিক্স',
    slug: 'electronics',
    icon: 'Cpu',
    description: 'Gadgets, devices & accessories',
    descriptionBn: 'গ্যাজেট, ডিভাইস ও আনুষাঙ্গিক',
    children: [
      { name: 'Smartphones', nameBn: 'স্মার্টফোন', slug: 'smartphones', icon: 'Smartphone' },
      { name: 'Laptops', nameBn: 'ল্যাপটপ', slug: 'laptops', icon: 'Laptop' },
      { name: 'Tablets', nameBn: 'ট্যাবলেট', slug: 'tablets', icon: 'Tablet' },
      { name: 'Headphones', nameBn: 'হেডফোন', slug: 'headphones', icon: 'Headphones' },
      { name: 'Smart Watches', nameBn: 'স্মার্ট ওয়াচ', slug: 'smart-watches', icon: 'Watch' },
      { name: 'Cameras', nameBn: 'ক্যামেরা', slug: 'cameras', icon: 'Camera' },
    ],
  },
  {
    name: 'Fashion',
    nameBn: 'ফ্যাশন',
    slug: 'fashion',
    icon: 'Shirt',
    description: 'Clothing, shoes & accessories for men and women',
    descriptionBn: 'পুরুষ ও নারীদের জন্য পোশাক, জুতা ও আনুষাঙ্গিক',
    children: [
      { name: "Men's Clothing", nameBn: 'পুরুষদের পোশাক', slug: 'mens-clothing' },
      { name: "Women's Clothing", nameBn: 'নারীদের পোশাক', slug: 'womens-clothing' },
      { name: 'Shoes', nameBn: 'জুতা', slug: 'shoes' },
      { name: 'Bags', nameBn: 'ব্যাগ', slug: 'bags' },
      { name: 'Jewelry', nameBn: 'গহনা', slug: 'jewelry' },
    ],
  },
  {
    name: 'Home & Living',
    nameBn: 'হোম ও লিভিং',
    slug: 'home-living',
    icon: 'Home',
    description: 'Furniture, decor & household essentials',
    descriptionBn: 'আসবাবপত্র, সাজসজ্জা ও গৃহস্থালি প্রয়োজনীয়তা',
    children: [
      { name: 'Furniture', nameBn: 'আসবাবপত্র', slug: 'furniture' },
      { name: 'Home Decor', nameBn: 'হোম ডেকর', slug: 'home-decor' },
      { name: 'Kitchen & Dining', nameBn: 'রান্নাঘর ও ডাইনিং', slug: 'kitchen-dining' },
      { name: 'Bedding', nameBn: 'বিছানাপত্র', slug: 'bedding' },
    ],
  },
  {
    name: 'Beauty & Health',
    nameBn: 'বিউটি ও হেলথ',
    slug: 'beauty-health',
    icon: 'Heart',
    description: 'Skincare, makeup & wellness products',
    descriptionBn: 'স্কিনকেয়ার, মেকআপ ও সুস্থতা পণ্য',
    children: [
      { name: 'Skincare', nameBn: 'স্কিনকেয়ার', slug: 'skincare' },
      { name: 'Makeup', nameBn: 'মেকআপ', slug: 'makeup' },
      { name: 'Hair Care', nameBn: 'হেয়ার কেয়ার', slug: 'hair-care' },
      { name: 'Personal Care', nameBn: 'পার্সোনাল কেয়ার', slug: 'personal-care' },
    ],
  },
  {
    name: 'Groceries',
    nameBn: 'মুদি দোকান',
    slug: 'groceries',
    icon: 'ShoppingBasket',
    description: 'Daily essentials, food & beverages',
    descriptionBn: 'দৈনন্দিন প্রয়োজনীয়তা, খাদ্য ও পানীয়',
    children: [
      { name: 'Rice & Flour', nameBn: 'চাল ও আটা', slug: 'rice-flour' },
      { name: 'Spices', nameBn: 'মশলা', slug: 'spices' },
      { name: 'Snacks', nameBn: 'স্ন্যাকস', slug: 'snacks' },
      { name: 'Beverages', nameBn: 'পানীয়', slug: 'beverages' },
    ],
  },
  {
    name: 'Baby & Kids',
    nameBn: 'বেবি ও কিডস',
    slug: 'baby-kids',
    icon: 'Baby',
    description: 'Everything for babies, toddlers & children',
    descriptionBn: 'শিশু, ছোটদের ও বাচ্চাদের জন্য সবকিছু',
    children: [
      { name: 'Diapers & Wipes', nameBn: 'ডায়াপার ও ওয়াইপস', slug: 'diapers-wipes' },
      { name: 'Baby Food', nameBn: 'বেবি ফুড', slug: 'baby-food' },
      { name: 'Toys', nameBn: 'খেলনা', slug: 'toys' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    nameBn: 'স্পোর্টস ও আউটডোর',
    slug: 'sports-outdoors',
    icon: 'Dumbbell',
    description: 'Fitness equipment, sportswear & outdoor gear',
    descriptionBn: 'ফিটনেস সরঞ্জাম, স্পোর্টসওয়্যার ও আউটডোর গিয়ার',
  },
  {
    name: 'Books & Stationery',
    nameBn: 'বই ও স্টেশনারি',
    slug: 'books-stationery',
    icon: 'BookOpen',
    description: 'Books, notebooks, pens & office supplies',
    descriptionBn: 'বই, নোটবুক, কলম ও অফিস সরবরাহ',
  },
  {
    name: 'Automotive',
    nameBn: 'অটোমোটিভ',
    slug: 'automotive',
    icon: 'Car',
    description: 'Car & motorcycle parts, accessories & care',
    descriptionBn: 'গাড়ি ও মোটরসাইকেল যন্ত্রাংশ, আনুষাঙ্গিক ও যত্ন',
  },
  {
    name: 'Pets',
    nameBn: 'পোষা প্রাণী',
    slug: 'pets',
    icon: 'PawPrint',
    description: 'Pet food, accessories & supplies',
    descriptionBn: 'পোষা প্রাণীর খাবার, আনুষাঙ্গিক ও সরবরাহ',
  },
];

async function seedCategories() {
  console.log('Seeding categories...');
  let count = 0;

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];

    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        nameBn: cat.nameBn,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        descriptionBn: cat.descriptionBn,
        sortOrder: i,
        isActive: true,
      },
    });
    count++;

    if (cat.children) {
      for (let j = 0; j < cat.children.length; j++) {
        const child = cat.children[j];
        await prisma.category.upsert({
          where: { slug: child.slug },
          update: {},
          create: {
            name: child.name,
            nameBn: child.nameBn,
            slug: child.slug,
            icon: child.icon,
            parentId: parent.id,
            sortOrder: j,
            isActive: true,
          },
        });
        count++;
      }
    }
  }

  console.log(`  Seeded ${count} categories`);
}

// ---------------------------------------------------------------------------
// Seed: Brands
// ---------------------------------------------------------------------------
interface BrandSeed {
  name: string;
  nameBn?: string;
  slug: string;
  logo?: string;
  website?: string;
}

const BRANDS: BrandSeed[] = [
  { name: 'Samsung', nameBn: 'স্যামসাং', slug: 'samsung', website: 'https://samsung.com/bd' },
  { name: 'Walton', nameBn: 'ওয়ালটন', slug: 'walton', website: 'https://waltonbd.com' },
  { name: 'Symphony', nameBn: 'সিম্ফনি', slug: 'symphony', website: 'https://symphony-mobile.com' },
  { name: 'Xiaomi', nameBn: 'শাওমি', slug: 'xiaomi', website: 'https://mi.com/bd' },
  { name: 'Apple', nameBn: 'অ্যাপল', slug: 'apple', website: 'https://apple.com' },
  { name: 'Realme', nameBn: 'রিয়েলমি', slug: 'realme', website: 'https://realme.com/bd' },
  { name: 'HP', slug: 'hp', website: 'https://hp.com' },
  { name: 'Lenovo', nameBn: 'লেনোভো', slug: 'lenovo', website: 'https://lenovo.com' },
  { name: 'Apex', nameBn: 'এপেক্স', slug: 'apex', website: 'https://apexadelchi.com' },
  { name: 'Bata', nameBn: 'বাটা', slug: 'bata', website: 'https://bata.com.bd' },
  { name: 'Aarong', nameBn: 'আড়ং', slug: 'aarong', website: 'https://aarong.com' },
  { name: 'Yellow', nameBn: 'ইয়েলো', slug: 'yellow', website: 'https://yellowclothing.com' },
  { name: 'RFL', nameBn: 'আরএফএল', slug: 'rfl', website: 'https://rfleshop.com' },
  { name: 'Pran', nameBn: 'প্রাণ', slug: 'pran', website: 'https://pranfoods.net' },
  { name: 'ACI', nameBn: 'এসিআই', slug: 'aci', website: 'https://aci-bd.com' },
  { name: 'Unilever', nameBn: 'ইউনিলিভার', slug: 'unilever', website: 'https://unilever.com.bd' },
  { name: 'JBL', slug: 'jbl', website: 'https://jbl.com' },
  { name: 'Sony', nameBn: 'সনি', slug: 'sony', website: 'https://sony.com.bd' },
  { name: 'Vivo', nameBn: 'ভিভো', slug: 'vivo', website: 'https://vivo.com/bd' },
  { name: 'OPPO', nameBn: 'অপো', slug: 'oppo', website: 'https://oppo.com/bd' },
  { name: 'Adidas', slug: 'adidas', website: 'https://adidas.com' },
  { name: 'Huggies', slug: 'huggies', website: 'https://huggies.com' },
  { name: 'Hatil', nameBn: 'হাতিল', slug: 'hatil', website: 'https://hatil.com' },
  { name: 'Canon', slug: 'canon', website: 'https://canon.com' },
];

// Generic brand-logo placeholder (abstract mark). Admin can replace per-brand
// logos through /admin/brands after seed.
const BRAND_LOGO_PLACEHOLDER =
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=400&fit=crop&q=80';

async function seedBrands() {
  console.log('Seeding brands...');
  const brandMap: Record<string, string> = {};

  const logoUrl = await seedImage(BRAND_LOGO_PLACEHOLDER, 'brands');

  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { logo: b.logo ?? logoUrl },
      create: {
        name: b.name,
        nameBn: b.nameBn,
        slug: b.slug,
        logo: b.logo ?? logoUrl,
        website: b.website,
        isActive: true,
      },
    });
    brandMap[b.slug] = brand.id;
  }

  console.log(`  Seeded ${BRANDS.length} brands`);
  return brandMap;
}

// ---------------------------------------------------------------------------
// Seed: Sample Products
// ---------------------------------------------------------------------------
interface ProductSeed {
  name: string;
  nameBn?: string;
  slug: string;
  description: string;
  descriptionBn?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  quantity: number;
  categorySlug: string;
  brandSlug?: string;
  tags: string[];
  isFeatured: boolean;
  weight?: number;
  images: string[];
  variants?: Array<{
    name: string;
    sku: string;
    price: number;
    quantity: number;
  }>;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Samsung Galaxy A55 5G',
    nameBn: 'স্যামসাং গ্যালাক্সি এ৫৫ ৫জি',
    slug: 'samsung-galaxy-a55-5g',
    description:
      'Samsung Galaxy A55 5G features a 6.6" Super AMOLED display, Exynos 1480 processor, 50MP triple camera system, 5000mAh battery with 25W fast charging. Water resistant with IP67 rating.',
    descriptionBn:
      'স্যামসাং গ্যালাক্সি এ৫৫ ৫জি-তে রয়েছে ৬.৬" সুপার অ্যামোলেড ডিসপ্লে, এক্সিনোস ১৪৮০ প্রসেসর, ৫০MP ট্রিপল ক্যামেরা সিস্টেম, ৫০০০mAh ব্যাটারি।',
    shortDescription: '6.6" AMOLED, Exynos 1480, 50MP Camera, 5000mAh',
    sku: 'SAM-A55-5G-001',
    price: 42999,
    compareAtPrice: 47999,
    costPrice: 36000,
    quantity: 150,
    categorySlug: 'smartphones',
    brandSlug: 'samsung',
    tags: ['5g', 'samsung', 'galaxy', 'smartphone', 'amoled'],
    isFeatured: true,
    weight: 0.213,
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: '8GB/128GB - Awesome Iceblue', sku: 'SAM-A55-128-ICE', price: 42999, quantity: 50 },
      { name: '8GB/256GB - Awesome Lilac', sku: 'SAM-A55-256-LIL', price: 46999, quantity: 40 },
      { name: '8GB/256GB - Awesome Navy', sku: 'SAM-A55-256-NAV', price: 46999, quantity: 60 },
    ],
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro',
    nameBn: 'শাওমি রেডমি নোট ১৩ প্রো',
    slug: 'xiaomi-redmi-note-13-pro',
    description:
      'Redmi Note 13 Pro with 200MP main camera, 6.67" AMOLED 120Hz display, Snapdragon 7s Gen 2 chipset, 5100mAh battery with 67W turbo charging.',
    shortDescription: '200MP Camera, 120Hz AMOLED, Snapdragon 7s Gen 2',
    sku: 'XIA-RN13P-001',
    price: 31999,
    compareAtPrice: 35999,
    costPrice: 26000,
    quantity: 200,
    categorySlug: 'smartphones',
    brandSlug: 'xiaomi',
    tags: ['xiaomi', 'redmi', 'smartphone', '200mp', 'amoled'],
    isFeatured: true,
    weight: 0.187,
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Walton Primo R9 Max',
    nameBn: 'ওয়ালটন প্রিমো আর৯ ম্যাক্স',
    slug: 'walton-primo-r9-max',
    description:
      'Walton Primo R9 Max — made in Bangladesh. 6.78" IPS display, 108MP AI camera, 6000mAh massive battery, 8GB RAM + 128GB storage. Dual SIM with dedicated SD card slot.',
    descriptionBn:
      'ওয়ালটন প্রিমো আর৯ ম্যাক্স — বাংলাদেশে তৈরি। ৬.৭৮" আইপিএস ডিসপ্লে, ১০৮MP এআই ক্যামেরা, ৬০০০mAh ব্যাটারি।',
    shortDescription: 'Made in BD, 108MP, 6000mAh, 8GB RAM',
    sku: 'WAL-PR9M-001',
    price: 17999,
    compareAtPrice: 19999,
    costPrice: 14500,
    quantity: 300,
    categorySlug: 'smartphones',
    brandSlug: 'walton',
    tags: ['walton', 'smartphone', 'made-in-bangladesh', 'budget'],
    isFeatured: true,
    weight: 0.21,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'HP Pavilion 15 Laptop',
    nameBn: 'এইচপি প্যাভিলিয়ন ১৫ ল্যাপটপ',
    slug: 'hp-pavilion-15-laptop',
    description:
      'HP Pavilion 15 with 13th Gen Intel Core i5-1335U, 15.6" FHD IPS display, 8GB DDR4, 512GB NVMe SSD, Intel Iris Xe Graphics. Windows 11 Home. Ideal for work and study.',
    shortDescription: 'i5-13th Gen, 8GB RAM, 512GB SSD, 15.6" FHD',
    sku: 'HP-PAV15-I5-001',
    price: 68999,
    compareAtPrice: 75999,
    costPrice: 58000,
    quantity: 45,
    categorySlug: 'laptops',
    brandSlug: 'hp',
    tags: ['hp', 'laptop', 'intel', 'i5', 'pavilion'],
    isFeatured: true,
    weight: 1.74,
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'i5/8GB/512GB SSD', sku: 'HP-PAV15-I5-8-512', price: 68999, quantity: 25 },
      { name: 'i7/16GB/512GB SSD', sku: 'HP-PAV15-I7-16-512', price: 89999, quantity: 20 },
    ],
  },
  {
    name: 'Lenovo IdeaPad Slim 3',
    nameBn: 'লেনোভো আইডিয়াপ্যাড স্লিম ৩',
    slug: 'lenovo-ideapad-slim-3',
    description:
      'Lenovo IdeaPad Slim 3 with AMD Ryzen 5 7520U, 15.6" FHD display, 8GB RAM, 512GB SSD, integrated Radeon graphics. Lightweight at 1.63kg with up to 10 hours battery life.',
    shortDescription: 'Ryzen 5, 8GB, 512GB SSD, Ultra-light 1.63kg',
    sku: 'LEN-IPS3-R5-001',
    price: 56999,
    compareAtPrice: 62000,
    costPrice: 47000,
    quantity: 60,
    categorySlug: 'laptops',
    brandSlug: 'lenovo',
    tags: ['lenovo', 'laptop', 'amd', 'ryzen5', 'lightweight'],
    isFeatured: false,
    weight: 1.63,
    images: [
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'JBL Tune 760NC Headphones',
    nameBn: 'জেবিএল টিউন ৭৬০এনসি হেডফোন',
    slug: 'jbl-tune-760nc-headphones',
    description:
      'JBL Tune 760NC wireless over-ear headphones with Active Noise Cancelling, JBL Pure Bass Sound, 50 hours of battery life, multi-point connection, lightweight and foldable design.',
    shortDescription: 'ANC, 50hr Battery, JBL Pure Bass, Foldable',
    sku: 'JBL-T760NC-001',
    price: 8999,
    compareAtPrice: 11999,
    costPrice: 6500,
    quantity: 120,
    categorySlug: 'headphones',
    brandSlug: 'jbl',
    tags: ['jbl', 'headphones', 'anc', 'wireless', 'bluetooth'],
    isFeatured: true,
    weight: 0.25,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583394838223-aef6146a7f61?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'Black', sku: 'JBL-T760NC-BLK', price: 8999, quantity: 40 },
      { name: 'Blue', sku: 'JBL-T760NC-BLU', price: 8999, quantity: 40 },
      { name: 'White', sku: 'JBL-T760NC-WHT', price: 8999, quantity: 40 },
    ],
  },
  {
    name: 'Aarong Handloom Cotton Saree',
    nameBn: 'আড়ং হ্যান্ডলুম কটন শাড়ি',
    slug: 'aarong-handloom-cotton-saree',
    description:
      'Authentic Bangladeshi handloom cotton saree from Aarong. Traditional jamdani-inspired weave with contemporary design. 6.5 yards with blouse piece. Perfect for everyday elegance.',
    descriptionBn:
      'আড়ং-এর খাঁটি বাংলাদেশী হ্যান্ডলুম কটন শাড়ি। ঐতিহ্যবাহী জামদানি-অনুপ্রাণিত বুনন সমসাময়িক ডিজাইনে।',
    shortDescription: 'Handloom cotton, jamdani weave, 6.5 yards',
    sku: 'ARG-SAREE-HLC-001',
    price: 3500,
    compareAtPrice: 4200,
    costPrice: 2200,
    quantity: 80,
    categorySlug: 'womens-clothing',
    brandSlug: 'aarong',
    tags: ['aarong', 'saree', 'handloom', 'cotton', 'jamdani', 'traditional'],
    isFeatured: true,
    weight: 0.45,
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Bata Comfit Formal Shoes',
    nameBn: 'বাটা কমফিট ফর্মাল শু',
    slug: 'bata-comfit-formal-shoes',
    description:
      'Bata Comfit formal leather shoes for men. Genuine leather upper with memory foam insole for all-day comfort. Anti-slip rubber sole. Perfect for office and formal events.',
    shortDescription: 'Genuine leather, memory foam, anti-slip sole',
    sku: 'BAT-CMF-FORM-001',
    price: 4599,
    compareAtPrice: 5499,
    costPrice: 3200,
    quantity: 100,
    categorySlug: 'shoes',
    brandSlug: 'bata',
    tags: ['bata', 'shoes', 'formal', 'leather', 'mens'],
    isFeatured: false,
    weight: 0.8,
    images: [
      'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'Size 40 - Black', sku: 'BAT-CMF-40-BLK', price: 4599, quantity: 20 },
      { name: 'Size 41 - Black', sku: 'BAT-CMF-41-BLK', price: 4599, quantity: 25 },
      { name: 'Size 42 - Black', sku: 'BAT-CMF-42-BLK', price: 4599, quantity: 30 },
      { name: 'Size 43 - Brown', sku: 'BAT-CMF-43-BRN', price: 4599, quantity: 25 },
    ],
  },
  {
    name: 'Yellow Premium Panjabi',
    nameBn: 'ইয়েলো প্রিমিয়াম পাঞ্জাবি',
    slug: 'yellow-premium-panjabi',
    description:
      'Premium cotton panjabi from Yellow. Intricate embroidery on collar and cuffs, slim fit design. Available in multiple colors. Perfect for Eid, weddings, and festive occasions.',
    descriptionBn:
      'ইয়েলো-এর প্রিমিয়াম কটন পাঞ্জাবি। কলার ও কাফে সূক্ষ্ম এমব্রয়ডারি, স্লিম ফিট ডিজাইন।',
    shortDescription: 'Premium cotton, embroidered, slim fit',
    sku: 'YLW-PNJ-PRM-001',
    price: 2800,
    compareAtPrice: 3500,
    costPrice: 1600,
    quantity: 150,
    categorySlug: 'mens-clothing',
    brandSlug: 'yellow',
    tags: ['yellow', 'panjabi', 'eid', 'traditional', 'cotton'],
    isFeatured: true,
    weight: 0.35,
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'M - White', sku: 'YLW-PNJ-M-WHT', price: 2800, quantity: 30 },
      { name: 'L - White', sku: 'YLW-PNJ-L-WHT', price: 2800, quantity: 40 },
      { name: 'XL - Off-White', sku: 'YLW-PNJ-XL-OWH', price: 2800, quantity: 40 },
      { name: 'XXL - Navy', sku: 'YLW-PNJ-XXL-NAV', price: 2800, quantity: 40 },
    ],
  },
  {
    name: 'RFL Premium Dinner Set 36 Pcs',
    nameBn: 'আরএফএল প্রিমিয়াম ডিনার সেট ৩৬ পিস',
    slug: 'rfl-premium-dinner-set-36pcs',
    description:
      'RFL Premium melamine dinner set, 36 pieces. Includes dinner plates, side plates, bowls, serving bowls, serving spoons, and platter. Microwave safe, BPA free. Elegant floral design.',
    shortDescription: '36 pcs melamine, microwave safe, BPA free',
    sku: 'RFL-DNS-36-001',
    price: 2999,
    compareAtPrice: 3699,
    costPrice: 2100,
    quantity: 75,
    categorySlug: 'kitchen-dining',
    brandSlug: 'rfl',
    tags: ['rfl', 'dinner-set', 'melamine', 'kitchen', 'dining'],
    isFeatured: false,
    weight: 3.5,
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Apex Cotton Bedsheet King Size',
    nameBn: 'এপেক্স কটন বেডশিট কিং সাইজ',
    slug: 'apex-cotton-bedsheet-king',
    description:
      'Apex 100% cotton bedsheet set for king-size beds. Includes 1 fitted sheet, 1 flat sheet, and 2 pillow covers. 300 thread count, wrinkle-resistant, soft & breathable.',
    shortDescription: '100% cotton, 300TC, king size, 4 pcs set',
    sku: 'APX-BED-KING-001',
    price: 2200,
    compareAtPrice: 2800,
    costPrice: 1400,
    quantity: 90,
    categorySlug: 'bedding',
    brandSlug: 'apex',
    tags: ['apex', 'bedsheet', 'cotton', 'king-size', 'bedding'],
    isFeatured: false,
    weight: 1.2,
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Unilever Dove Skincare Gift Set',
    nameBn: 'ইউনিলিভার ডাভ স্কিনকেয়ার গিফট সেট',
    slug: 'dove-skincare-gift-set',
    description:
      'Dove skincare gift set with body wash 250ml, body lotion 250ml, beauty bar 100g x2, and deodorant 150ml. Gentle formula with 1/4 moisturizing cream. Perfect gift for her.',
    shortDescription: '5-piece set: body wash, lotion, soap, deo',
    sku: 'UNI-DOVE-GFT-001',
    price: 1599,
    compareAtPrice: 2100,
    costPrice: 1050,
    quantity: 200,
    categorySlug: 'skincare',
    brandSlug: 'unilever',
    tags: ['dove', 'skincare', 'gift-set', 'moisturizing', 'beauty'],
    isFeatured: false,
    weight: 0.95,
    images: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Pran Aromatic Chinigura Rice 5kg',
    nameBn: 'প্রাণ অ্যারোমেটিক চিনিগুড়া চাল ৫কেজি',
    slug: 'pran-chinigura-rice-5kg',
    description:
      'Premium aromatic Chinigura rice from Pran. Sourced from the finest paddies of Bangladesh. Small grain, naturally fragrant. Perfect for special rice dishes like polao and biriyani.',
    descriptionBn:
      'প্রাণ-এর প্রিমিয়াম সুগন্ধি চিনিগুড়া চাল। বাংলাদেশের সেরা ধান থেকে সংগৃহীত। পোলাও ও বিরিয়ানির জন্য আদর্শ।',
    shortDescription: 'Premium chinigura, 5kg, naturally aromatic',
    sku: 'PRN-RICE-CG-5KG',
    price: 850,
    compareAtPrice: 950,
    costPrice: 650,
    quantity: 500,
    categorySlug: 'rice-flour',
    brandSlug: 'pran',
    tags: ['pran', 'rice', 'chinigura', 'aromatic', 'premium'],
    isFeatured: false,
    weight: 5.0,
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'ACI Pure Turmeric Powder 200g',
    nameBn: 'এসিআই পিওর হলুদ গুঁড়া ২০০গ্রাম',
    slug: 'aci-pure-turmeric-200g',
    description:
      'ACI Pure turmeric powder, 100% natural with no artificial colors or preservatives. Lab tested for quality and purity. Essential spice for Bangladeshi cooking.',
    descriptionBn:
      'এসিআই পিওর হলুদ গুঁড়া, ১০০% প্রাকৃতিক। কোনো কৃত্রিম রঙ বা প্রিজারভেটিভ নেই। বাংলাদেশী রান্নার অপরিহার্য মশলা।',
    shortDescription: '100% natural, no preservatives, 200g',
    sku: 'ACI-TRM-200G',
    price: 95,
    costPrice: 60,
    quantity: 1000,
    categorySlug: 'spices',
    brandSlug: 'aci',
    tags: ['aci', 'spice', 'turmeric', 'pure', 'cooking'],
    isFeatured: false,
    weight: 0.2,
    images: [
      'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Apple iPhone 15 Pro',
    nameBn: 'অ্যাপল আইফোন ১৫ প্রো',
    slug: 'apple-iphone-15-pro',
    description:
      'iPhone 15 Pro with A17 Pro chip, titanium design, 48MP main camera with 5x optical zoom, Action button, USB-C with USB 3. Super Retina XDR 6.1" ProMotion display.',
    shortDescription: 'A17 Pro, Titanium, 48MP, USB-C, 6.1" ProMotion',
    sku: 'APL-IP15P-001',
    price: 159999,
    compareAtPrice: 169999,
    costPrice: 140000,
    quantity: 30,
    categorySlug: 'smartphones',
    brandSlug: 'apple',
    tags: ['apple', 'iphone', 'pro', 'titanium', 'flagship'],
    isFeatured: true,
    weight: 0.187,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: '128GB - Natural Titanium', sku: 'APL-IP15P-128-NAT', price: 159999, quantity: 10 },
      { name: '256GB - Blue Titanium', sku: 'APL-IP15P-256-BLU', price: 179999, quantity: 10 },
      { name: '512GB - Black Titanium', sku: 'APL-IP15P-512-BLK', price: 209999, quantity: 10 },
    ],
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    nameBn: 'সনি ডাব্লিউএইচ-১০০০এক্সএম৫ ওয়্যারলেস হেডফোন',
    slug: 'sony-wh-1000xm5',
    description:
      'Sony WH-1000XM5 — industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery, quick charging (3 min = 3 hours). Multipoint connection, Speak-to-Chat, LDAC Hi-Res Audio.',
    shortDescription: 'Best-in-class ANC, 30hr battery, Hi-Res Audio',
    sku: 'SNY-WH1000XM5-001',
    price: 32999,
    compareAtPrice: 39999,
    costPrice: 27000,
    quantity: 40,
    categorySlug: 'headphones',
    brandSlug: 'sony',
    tags: ['sony', 'headphones', 'anc', 'wireless', 'hi-res', 'premium'],
    isFeatured: true,
    weight: 0.25,
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'Black', sku: 'SNY-XM5-BLK', price: 32999, quantity: 20 },
      { name: 'Silver', sku: 'SNY-XM5-SLV', price: 32999, quantity: 20 },
    ],
  },
  {
    name: 'Samsung 43" Crystal UHD 4K Smart TV',
    nameBn: 'স্যামসাং ৪৩" ক্রিস্টাল ইউএইচডি ৪কে স্মার্ট টিভি',
    slug: 'samsung-43-crystal-uhd-4k-tv',
    description:
      'Samsung 43" Crystal UHD 4K Smart TV with Crystal Processor 4K, HDR, PurColor technology, Smart Hub with Tizen OS. Built-in voice assistant, screen mirroring, and multiple HDMI ports.',
    shortDescription: '43" 4K UHD, Crystal Processor, Smart Hub, HDR',
    sku: 'SAM-TV43-CU-001',
    price: 41999,
    compareAtPrice: 48999,
    costPrice: 35000,
    quantity: 25,
    categorySlug: 'electronics',
    brandSlug: 'samsung',
    tags: ['samsung', 'tv', '4k', 'smart-tv', 'uhd'],
    isFeatured: true,
    weight: 8.3,
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Realme C67 4G',
    nameBn: 'রিয়েলমি সি৬৭ ৪জি',
    slug: 'realme-c67-4g',
    description:
      'Realme C67 4G with 108MP main camera, Snapdragon 685 processor, 6.72" 90Hz display, 5000mAh battery with 33W SUPERVOOC charging. Ultra-slim 7.89mm design.',
    shortDescription: '108MP, Snapdragon 685, 90Hz, 33W charging',
    sku: 'RLM-C67-001',
    price: 16999,
    compareAtPrice: 18999,
    costPrice: 13500,
    quantity: 180,
    categorySlug: 'smartphones',
    brandSlug: 'realme',
    tags: ['realme', 'budget', 'smartphone', '108mp'],
    isFeatured: false,
    weight: 0.192,
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Walton WFA-2F6-RXXX Refrigerator',
    nameBn: 'ওয়ালটন ফ্রিজ ডাবল ডোর',
    slug: 'walton-refrigerator-double-door',
    description:
      'Walton double door frost-free refrigerator, 260L capacity. Inverter compressor for energy efficiency. Vegetable crisper, egg tray, door pockets. Made in Bangladesh with 12-year compressor warranty.',
    descriptionBn:
      'ওয়ালটন ডাবল ডোর ফ্রস্ট-ফ্রি রেফ্রিজারেটর, ২৬০ লিটার ক্যাপাসিটি। ইনভার্টার কম্প্রেসর। বাংলাদেশে তৈরি।',
    shortDescription: '260L, Frost-free, Inverter, 12yr warranty',
    sku: 'WAL-REF-260-001',
    price: 32999,
    compareAtPrice: 37999,
    costPrice: 27000,
    quantity: 35,
    categorySlug: 'electronics',
    brandSlug: 'walton',
    tags: ['walton', 'refrigerator', 'inverter', 'made-in-bangladesh', 'appliance'],
    isFeatured: false,
    weight: 52.0,
    images: [
      'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Aarong Leather Messenger Bag',
    nameBn: 'আড়ং লেদার মেসেঞ্জার ব্যাগ',
    slug: 'aarong-leather-messenger-bag',
    description:
      'Handcrafted genuine leather messenger bag from Aarong. Features adjustable strap, multiple compartments, laptop sleeve (fits up to 14"), magnetic clasp closure. Artisan-made in Bangladesh.',
    shortDescription: 'Genuine leather, handcrafted, fits 14" laptop',
    sku: 'ARG-BAG-MSG-001',
    price: 5800,
    compareAtPrice: 6500,
    costPrice: 3800,
    quantity: 45,
    categorySlug: 'bags',
    brandSlug: 'aarong',
    tags: ['aarong', 'bag', 'leather', 'messenger', 'handcrafted'],
    isFeatured: false,
    weight: 0.9,
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&q=80',
    ],
    variants: [
      { name: 'Brown', sku: 'ARG-BAG-MSG-BRN', price: 5800, quantity: 25 },
      { name: 'Black', sku: 'ARG-BAG-MSG-BLK', price: 5800, quantity: 20 },
    ],
  },
  {
    name: 'Vivo Y28 5G',
    nameBn: 'ভিভো ওয়াই২৮ ৫জি',
    slug: 'vivo-y28-5g',
    description:
      'Vivo Y28 5G with Dimensity 6020, 6.56" HD+ display, 50MP main camera, 5000mAh battery with 15W charging. 5G ready, IP54 water resistant.',
    shortDescription: '5G, Dimensity 6020, 50MP, 5000mAh',
    sku: 'VIV-Y28-5G-001',
    price: 18999,
    compareAtPrice: 20999,
    costPrice: 15000,
    quantity: 100,
    categorySlug: 'smartphones',
    brandSlug: 'vivo',
    tags: ['vivo', '5g', 'budget', 'smartphone'],
    isFeatured: false,
    weight: 0.19,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Baby & Kids
  {
    name: 'Huggies Wonder Pants L (42 pcs)',
    slug: 'huggies-wonder-pants-l-42',
    description:
      'Huggies Wonder Pants diapers size L (9-14kg), 42 pieces. Double leak guard, bubble bed softness, up to 12 hours absorption. Gentle on baby skin.',
    shortDescription: '42 pcs, size L, 12hr absorption, bubble bed',
    sku: 'HUG-WP-L42-001',
    price: 1350,
    compareAtPrice: 1500,
    costPrice: 1050,
    quantity: 400,
    categorySlug: 'diapers-wipes',
    brandSlug: 'huggies',
    tags: ['huggies', 'diapers', 'baby', 'pants'],
    isFeatured: false,
    weight: 1.5,
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Kids Educational Building Blocks (150 pcs)',
    slug: 'kids-building-blocks-150',
    description:
      'Colorful educational building blocks set with 150 pieces. BPA-free, non-toxic ABS plastic. Stimulates creativity and motor skills. Ages 3+.',
    shortDescription: '150 pcs, BPA-free, educational, ages 3+',
    sku: 'TOY-BLKS-150-001',
    price: 899,
    compareAtPrice: 1200,
    costPrice: 550,
    quantity: 200,
    categorySlug: 'toys',
    tags: ['toys', 'educational', 'blocks', 'kids'],
    isFeatured: false,
    weight: 0.8,
    images: [
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Sports & Outdoors
  {
    name: 'Adidas Ultraboost Running Shoes',
    slug: 'adidas-ultraboost-running',
    description:
      'Adidas Ultraboost running shoes with responsive BOOST midsole, Primeknit upper, Continental rubber outsole. Lightweight and breathable for maximum comfort.',
    shortDescription: 'BOOST midsole, Primeknit, Continental rubber',
    sku: 'ADI-UB-RUN-001',
    price: 16999,
    compareAtPrice: 19999,
    costPrice: 12000,
    quantity: 80,
    categorySlug: 'sports-outdoors',
    brandSlug: 'adidas',
    tags: ['adidas', 'running', 'shoes', 'ultraboost', 'sports'],
    isFeatured: true,
    weight: 0.65,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Professional Yoga Mat with Bag',
    slug: 'professional-yoga-mat',
    description:
      'Premium 6mm thick TPE yoga mat with alignment lines and carrying bag. Non-slip, eco-friendly, moisture resistant. Perfect for yoga, pilates, and home workouts.',
    shortDescription: '6mm TPE, non-slip, alignment lines, with bag',
    sku: 'SPT-YOGA-MAT-001',
    price: 1499,
    compareAtPrice: 1999,
    costPrice: 800,
    quantity: 150,
    categorySlug: 'sports-outdoors',
    tags: ['yoga', 'mat', 'fitness', 'exercise'],
    isFeatured: false,
    weight: 1.2,
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Books & Stationery
  {
    name: 'Classic Leather-Bound Journal',
    slug: 'leather-bound-journal',
    description:
      'Handmade leather-bound journal with 200 pages of premium unlined paper. Vintage brass clasp, A5 size. Perfect for writing, sketching, or journaling.',
    shortDescription: 'A5 leather, 200 pages, brass clasp, handmade',
    sku: 'BKS-JRNL-LTH-001',
    price: 650,
    compareAtPrice: 850,
    costPrice: 350,
    quantity: 120,
    categorySlug: 'books-stationery',
    tags: ['journal', 'leather', 'notebook', 'stationery'],
    isFeatured: false,
    weight: 0.35,
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Premium Fountain Pen Gift Set',
    slug: 'premium-fountain-pen-set',
    description:
      'Elegant fountain pen gift set with brass body, iridium nib, and 6 ink cartridges. Comes in a luxurious gift box. Perfect for signatures and calligraphy.',
    shortDescription: 'Brass body, iridium nib, 6 cartridges, gift box',
    sku: 'BKS-PEN-FTN-001',
    price: 1200,
    compareAtPrice: 1500,
    costPrice: 700,
    quantity: 80,
    categorySlug: 'books-stationery',
    tags: ['pen', 'fountain', 'gift', 'stationery', 'calligraphy'],
    isFeatured: false,
    weight: 0.2,
    images: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Home Decor / Furniture
  {
    name: 'Hatil Elegant Wooden Dining Table',
    slug: 'hatil-wooden-dining-table',
    description:
      'Hatil 6-seater wooden dining table crafted from premium Segun wood. Modern minimalist design with smooth lacquer finish. Made in Bangladesh. 5-year warranty.',
    shortDescription: '6-seater, Segun wood, 5yr warranty, Made in BD',
    sku: 'HAT-DT6-SEG-001',
    price: 45000,
    compareAtPrice: 52000,
    costPrice: 32000,
    quantity: 15,
    categorySlug: 'furniture',
    brandSlug: 'hatil',
    tags: ['hatil', 'dining-table', 'furniture', 'wood', 'made-in-bangladesh'],
    isFeatured: true,
    weight: 35.0,
    images: [
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Decorative Wall Mirror Round Gold',
    slug: 'decorative-wall-mirror-gold',
    description:
      'Elegant round wall mirror with gold metal frame. 60cm diameter. Adds a touch of luxury to living rooms, bedrooms, or entryways. Easy wall mount included.',
    shortDescription: '60cm round, gold frame, wall mount included',
    sku: 'DEC-MIR-RND-001',
    price: 3500,
    compareAtPrice: 4200,
    costPrice: 2200,
    quantity: 50,
    categorySlug: 'home-decor',
    tags: ['mirror', 'decor', 'gold', 'wall', 'living-room'],
    isFeatured: false,
    weight: 3.5,
    images: [
      'https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Makeup / Hair Care / Jewelry
  {
    name: 'MAC Matte Lipstick Collection',
    slug: 'mac-matte-lipstick-collection',
    description:
      'MAC retro matte lipstick set of 3 shades — Ruby Woo, Velvet Teddy, and Diva. Creamy matte finish, long-lasting color, comfortable wear.',
    shortDescription: '3 shades, retro matte, long-lasting',
    sku: 'BH-MAC-LIP-001',
    price: 4500,
    compareAtPrice: 5400,
    costPrice: 3200,
    quantity: 60,
    categorySlug: 'makeup',
    tags: ['mac', 'lipstick', 'matte', 'makeup', 'beauty'],
    isFeatured: false,
    weight: 0.15,
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Gold Plated Pearl Necklace Set',
    slug: 'gold-pearl-necklace-set',
    description:
      '18K gold-plated pearl necklace and earring set. Genuine freshwater pearls, adjustable chain (16-20 inches). Elegant design perfect for weddings and special occasions.',
    shortDescription: '18K gold-plated, freshwater pearls, adjustable',
    sku: 'JWL-PRL-SET-001',
    price: 2800,
    compareAtPrice: 3500,
    costPrice: 1500,
    quantity: 70,
    categorySlug: 'jewelry',
    tags: ['jewelry', 'necklace', 'pearl', 'gold', 'wedding'],
    isFeatured: true,
    weight: 0.08,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Tablets / Smart Watches / Cameras
  {
    name: 'Samsung Galaxy Tab S9 FE',
    slug: 'samsung-galaxy-tab-s9-fe',
    description:
      'Samsung Galaxy Tab S9 FE with 10.9" LCD display, Exynos 1380, 6GB RAM, 128GB storage, S Pen included. IP68 water resistant, 8000mAh battery.',
    shortDescription: '10.9" LCD, S Pen included, IP68, 8000mAh',
    sku: 'SAM-TABS9FE-001',
    price: 44999,
    compareAtPrice: 49999,
    costPrice: 37000,
    quantity: 40,
    categorySlug: 'tablets',
    brandSlug: 'samsung',
    tags: ['samsung', 'tablet', 'galaxy-tab', 's-pen'],
    isFeatured: true,
    weight: 0.523,
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Canon EOS R50 Mirrorless Camera',
    slug: 'canon-eos-r50-mirrorless',
    description:
      'Canon EOS R50 with 24.2MP APS-C sensor, 4K video, DIGIC X processor, 15fps burst shooting. Compact and lightweight body with RF-S 18-45mm lens kit.',
    shortDescription: '24.2MP, 4K, DIGIC X, 15fps, with 18-45mm lens',
    sku: 'CAN-R50-KIT-001',
    price: 89999,
    compareAtPrice: 99999,
    costPrice: 72000,
    quantity: 20,
    categorySlug: 'cameras',
    brandSlug: 'canon',
    tags: ['canon', 'mirrorless', 'camera', '4k', 'photography'],
    isFeatured: true,
    weight: 0.375,
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Snacks / Beverages
  {
    name: 'Pran Frooto Mango Juice 1L (6 Pack)',
    slug: 'pran-frooto-mango-juice-6pack',
    description:
      'Pran Frooto mango juice drink, 1 liter pack of 6. Made from real mango pulp with no artificial colors. Refreshing and naturally delicious.',
    shortDescription: '6x 1L, real mango pulp, no artificial colors',
    sku: 'PRN-FROOT-1L-6PK',
    price: 480,
    compareAtPrice: 540,
    costPrice: 360,
    quantity: 300,
    categorySlug: 'beverages',
    brandSlug: 'pran',
    tags: ['pran', 'juice', 'mango', 'frooto', 'beverage'],
    isFeatured: false,
    weight: 6.5,
    images: ['https://images.unsplash.com/photo-1546173159-315724a31696?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Premium Mixed Nuts & Dry Fruits 500g',
    slug: 'premium-mixed-nuts-500g',
    description:
      'Premium mix of cashews, almonds, pistachios, raisins and dried cranberries. Roasted and lightly salted. Packed in resealable pouch. Healthy snacking choice.',
    shortDescription: '500g, 5 varieties, roasted, resealable pouch',
    sku: 'GRC-NUTS-MIX-500',
    price: 950,
    compareAtPrice: 1100,
    costPrice: 650,
    quantity: 200,
    categorySlug: 'snacks',
    tags: ['nuts', 'dry-fruits', 'snacks', 'healthy', 'premium'],
    isFeatured: false,
    weight: 0.5,
    images: [
      'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=800&h=800&fit=crop&q=80',
    ],
  },
  // Additional fashion/electronics
  {
    name: 'Apple Watch Series 9 GPS',
    slug: 'apple-watch-series-9-gps',
    description:
      'Apple Watch Series 9 with S9 chip, bright Always-On Retina display, blood oxygen sensor, ECG, crash detection. Double tap gesture. 45mm aluminum case.',
    shortDescription: 'S9 chip, Always-On, SpO2, ECG, 45mm',
    sku: 'APL-AWS9-45-001',
    price: 59999,
    compareAtPrice: 64999,
    costPrice: 50000,
    quantity: 35,
    categorySlug: 'smart-watches',
    brandSlug: 'apple',
    tags: ['apple', 'watch', 'smartwatch', 'fitness', 'health'],
    isFeatured: true,
    weight: 0.039,
    images: ['https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Adidas Classic Backpack',
    slug: 'adidas-classic-backpack',
    description:
      'Adidas classic backpack with padded laptop compartment, front zip pocket, and adjustable padded straps. Recycled polyester exterior. 25L capacity.',
    shortDescription: '25L, laptop pocket, recycled polyester',
    sku: 'ADI-BP-CLS-001',
    price: 3200,
    compareAtPrice: 3800,
    costPrice: 2000,
    quantity: 100,
    categorySlug: 'bags',
    brandSlug: 'adidas',
    tags: ['adidas', 'backpack', 'bag', 'laptop', 'sports'],
    isFeatured: false,
    weight: 0.45,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Samsung Galaxy Buds2 Pro',
    slug: 'samsung-galaxy-buds2-pro',
    description:
      'Samsung Galaxy Buds2 Pro with intelligent ANC, Hi-Fi 24bit audio, 360 Audio, IPX7 water resistant, up to 29hrs battery with case. Seamless Galaxy ecosystem.',
    shortDescription: 'Hi-Fi ANC, 360 Audio, IPX7, 29hr battery',
    sku: 'SAM-BUDS2P-001',
    price: 14999,
    compareAtPrice: 17999,
    costPrice: 11000,
    quantity: 70,
    categorySlug: 'headphones',
    brandSlug: 'samsung',
    tags: ['samsung', 'earbuds', 'anc', 'wireless', 'buds'],
    isFeatured: false,
    weight: 0.006,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Unilever TRESemme Keratin Shampoo 580ml',
    slug: 'tresemme-keratin-shampoo-580ml',
    description:
      'TRESemme Keratin Smooth shampoo 580ml. Infused with Keratin and Argan oil for 5 benefits: frizz control, smooth, shine, soft, manageable. Salon-quality hair care.',
    shortDescription: '580ml, keratin + argan oil, 5 benefits',
    sku: 'UNI-TRES-KS-580',
    price: 520,
    compareAtPrice: 599,
    costPrice: 380,
    quantity: 250,
    categorySlug: 'hair-care',
    brandSlug: 'unilever',
    tags: ['tresemme', 'shampoo', 'keratin', 'hair-care'],
    isFeatured: false,
    weight: 0.62,
    images: [
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&h=800&fit=crop&q=80',
    ],
  },
  // ──── Additional Products ─────────────────────────────────────────────────
  {
    name: 'Nike Air Max 270 Sneakers',
    slug: 'nike-air-max-270-sneakers',
    description:
      'Nike Air Max 270 with the largest-ever Max Air unit for a soft, comfortable ride. Mesh upper for breathability, foam midsole, and rubber outsole for traction.',
    shortDescription: 'Max Air unit, mesh upper, foam midsole',
    sku: 'NIK-AM270-001',
    price: 14999,
    compareAtPrice: 17999,
    costPrice: 10000,
    quantity: 90,
    categorySlug: 'shoes',
    tags: ['nike', 'sneakers', 'air-max', 'shoes', 'sports'],
    isFeatured: true,
    weight: 0.34,
    images: [
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'OnePlus 12 5G',
    slug: 'oneplus-12-5g',
    description:
      'OnePlus 12 5G with Snapdragon 8 Gen 3, 6.82" 2K LTPO AMOLED 120Hz, Hasselblad 50MP triple camera, 5400mAh with 100W SUPERVOOC. Flagship killer.',
    shortDescription: 'SD 8 Gen 3, 2K AMOLED, Hasselblad Camera, 100W',
    sku: 'OP-12-5G-001',
    price: 79999,
    compareAtPrice: 89999,
    costPrice: 65000,
    quantity: 40,
    categorySlug: 'smartphones',
    tags: ['oneplus', 'flagship', '5g', 'smartphone', 'hasselblad'],
    isFeatured: true,
    weight: 0.22,
    images: [
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    slug: 'logitech-mx-master-3s',
    description:
      'Logitech MX Master 3S wireless mouse with 8K DPI tracking, quiet clicks, MagSpeed scroll wheel, USB-C quick charge. Works on glass. Multi-device with Easy-Switch.',
    shortDescription: '8K DPI, quiet clicks, MagSpeed, USB-C',
    sku: 'LOG-MXM3S-001',
    price: 9999,
    compareAtPrice: 12999,
    costPrice: 7500,
    quantity: 60,
    categorySlug: 'electronics',
    tags: ['logitech', 'mouse', 'wireless', 'productivity', 'ergonomic'],
    isFeatured: false,
    weight: 0.141,
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Embroidered Silk Kameez Set',
    slug: 'embroidered-silk-kameez-set',
    description:
      'Luxurious embroidered silk kameez with matching dupatta and palazzo. Intricate thread and sequin work. Available in emerald green and royal maroon. Perfect for weddings and Eid.',
    descriptionBn: 'দারুণ এমব্রয়ডারি করা সিল্ক কামিজ সেট। ম্যাচিং দুপাট্টা ও পালাজো সহ।',
    shortDescription: 'Silk, embroidered, 3-piece set, festive',
    sku: 'FSH-SILK-KMZ-001',
    price: 6500,
    compareAtPrice: 8500,
    costPrice: 3800,
    quantity: 50,
    categorySlug: 'womens-clothing',
    brandSlug: 'aarong',
    tags: ['silk', 'kameez', 'embroidered', 'wedding', 'eid', 'women'],
    isFeatured: true,
    weight: 0.6,
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Havit Gaming Mechanical Keyboard',
    slug: 'havit-gaming-mechanical-keyboard',
    description:
      'Havit mechanical gaming keyboard with RGB backlighting, blue switches, anti-ghosting keys, metal body. USB wired with braided cable. Perfect for gaming and typing.',
    shortDescription: 'Mechanical blue switch, RGB, anti-ghosting',
    sku: 'HAV-KB-MECH-001',
    price: 3499,
    compareAtPrice: 4499,
    costPrice: 2200,
    quantity: 100,
    categorySlug: 'electronics',
    tags: ['keyboard', 'mechanical', 'gaming', 'rgb', 'havit'],
    isFeatured: false,
    weight: 0.85,
    images: [
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Wooden Bookshelf 5 Tier',
    slug: 'wooden-bookshelf-5-tier',
    description:
      'Modern 5-tier wooden bookshelf with industrial metal frame. Holds books, plants, and decor. Dimensions: 150cm H x 80cm W x 30cm D. Easy assembly with instructions.',
    shortDescription: '5 tiers, wood & metal, 150x80x30cm',
    sku: 'FRN-BKSHF-5T-001',
    price: 8500,
    compareAtPrice: 10500,
    costPrice: 5200,
    quantity: 30,
    categorySlug: 'furniture',
    brandSlug: 'hatil',
    tags: ['bookshelf', 'furniture', 'wood', 'storage', 'modern'],
    isFeatured: false,
    weight: 18.0,
    images: [
      'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Ray-Ban Aviator Sunglasses',
    slug: 'ray-ban-aviator-sunglasses',
    description:
      'Classic Ray-Ban Aviator sunglasses with gold metal frame, green G-15 lenses, 100% UV protection. Iconic pilot shape. Includes Ray-Ban case and cleaning cloth.',
    shortDescription: 'Gold frame, G-15 lens, 100% UV, iconic pilot',
    sku: 'RB-AVIA-GLD-001',
    price: 12999,
    compareAtPrice: 15999,
    costPrice: 9000,
    quantity: 55,
    categorySlug: 'jewelry',
    tags: ['ray-ban', 'sunglasses', 'aviator', 'uv-protection'],
    isFeatured: true,
    weight: 0.03,
    images: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Organic Green Tea Collection (50 bags)',
    slug: 'organic-green-tea-50-bags',
    description:
      'Premium organic green tea collection with 5 flavors: jasmine, mint, lemon, chamomile, and classic. 50 individually wrapped tea bags. Rich in antioxidants.',
    shortDescription: '50 bags, 5 flavors, organic, antioxidant-rich',
    sku: 'GRC-TEA-GRN-50',
    price: 450,
    compareAtPrice: 550,
    costPrice: 280,
    quantity: 300,
    categorySlug: 'beverages',
    tags: ['tea', 'green-tea', 'organic', 'healthy', 'beverage'],
    isFeatured: false,
    weight: 0.2,
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Baby Soft Cotton Romper Set (3 pcs)',
    slug: 'baby-cotton-romper-set-3pcs',
    description:
      '100% organic cotton baby romper set, pack of 3. Soft snap closures, comfortable for all-day wear. Ages 0-12 months. Machine washable. Pastel colors.',
    shortDescription: '3 pcs, organic cotton, 0-12 months, pastel',
    sku: 'BBY-ROMP-3PK-001',
    price: 1299,
    compareAtPrice: 1699,
    costPrice: 750,
    quantity: 150,
    categorySlug: 'diapers-wipes',
    tags: ['baby', 'romper', 'cotton', 'organic', 'clothes'],
    isFeatured: false,
    weight: 0.3,
    images: ['https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Philips Air Fryer HD9252',
    slug: 'philips-air-fryer-hd9252',
    description:
      'Philips Essential Air Fryer HD9252 with Rapid Air technology. 4.1L capacity, 1400W. Fry, bake, grill, and roast with up to 90% less fat. Digital touchscreen, 7 presets.',
    shortDescription: '4.1L, 1400W, 90% less fat, 7 presets',
    sku: 'PHL-AF-HD9252-001',
    price: 12999,
    compareAtPrice: 15999,
    costPrice: 9500,
    quantity: 40,
    categorySlug: 'kitchen-dining',
    tags: ['philips', 'air-fryer', 'kitchen', 'appliance', 'healthy'],
    isFeatured: true,
    weight: 4.5,
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Cotton Polo T-Shirt (Pack of 3)',
    slug: 'cotton-polo-tshirt-3pack',
    description:
      'Premium 100% combed cotton polo t-shirts, pack of 3. Colors: navy, white, and olive green. Regular fit, ribbed collar, two-button placket. Sizes M-XXL.',
    shortDescription: '3 pack, combed cotton, M-XXL, regular fit',
    sku: 'FSH-POLO-3PK-001',
    price: 1999,
    compareAtPrice: 2799,
    costPrice: 1100,
    quantity: 200,
    categorySlug: 'mens-clothing',
    brandSlug: 'yellow',
    tags: ['polo', 't-shirt', 'cotton', 'men', 'casual'],
    isFeatured: false,
    weight: 0.5,
    images: [
      'https://images.unsplash.com/photo-1625910513413-5fc421e0db4e?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'JBL Flip 6 Portable Speaker',
    slug: 'jbl-flip-6-speaker',
    description:
      'JBL Flip 6 portable Bluetooth speaker with powerful JBL Original Pro Sound, IP67 waterproof and dustproof, 12-hour playtime. PartyBoost for pairing multiple speakers.',
    shortDescription: 'IP67, 12hr battery, PartyBoost, Pro Sound',
    sku: 'JBL-FLIP6-001',
    price: 9499,
    compareAtPrice: 11999,
    costPrice: 7000,
    quantity: 65,
    categorySlug: 'electronics',
    brandSlug: 'jbl',
    tags: ['jbl', 'speaker', 'bluetooth', 'portable', 'waterproof'],
    isFeatured: true,
    weight: 0.55,
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Ceramic Plant Pots Set (3 pcs)',
    slug: 'ceramic-plant-pots-set-3pcs',
    description:
      'Minimalist ceramic plant pots set of 3 with bamboo trays. Sizes: small (10cm), medium (13cm), large (16cm). Drainage holes, matte finish. White, grey, terracotta.',
    shortDescription: '3 pcs, bamboo trays, matte finish, drainage',
    sku: 'DEC-POT-CRM-3PK',
    price: 1299,
    compareAtPrice: 1699,
    costPrice: 700,
    quantity: 80,
    categorySlug: 'home-decor',
    tags: ['plant-pot', 'ceramic', 'decor', 'garden', 'minimalist'],
    isFeatured: false,
    weight: 1.8,
    images: [
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Dell UltraSharp 27" 4K Monitor',
    slug: 'dell-ultrasharp-27-4k-monitor',
    description:
      'Dell UltraSharp U2723QE 27" 4K IPS monitor. 100% sRGB, 98% DCI-P3, USB-C with 90W power delivery, KVM switch, daisy chain. Factory calibrated with ComfortView Plus.',
    shortDescription: '27" 4K IPS, USB-C 90W, 98% DCI-P3',
    sku: 'DEL-U2723QE-001',
    price: 52999,
    compareAtPrice: 59999,
    costPrice: 42000,
    quantity: 25,
    categorySlug: 'electronics',
    tags: ['dell', 'monitor', '4k', 'usb-c', 'ultrasharp'],
    isFeatured: false,
    weight: 6.6,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Stainless Steel Water Bottle 750ml',
    slug: 'stainless-steel-water-bottle-750ml',
    description:
      'Double-wall vacuum insulated stainless steel water bottle. Keeps drinks cold 24hrs / hot 12hrs. BPA-free lid, leak-proof. Powder-coated matte finish.',
    shortDescription: '750ml, vacuum insulated, 24hr cold, leak-proof',
    sku: 'SPT-WB-SS-750',
    price: 699,
    compareAtPrice: 999,
    costPrice: 350,
    quantity: 250,
    categorySlug: 'sports-outdoors',
    tags: ['water-bottle', 'stainless-steel', 'insulated', 'sports', 'eco'],
    isFeatured: false,
    weight: 0.34,
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: "Women's Running Shoes Ultralight",
    slug: 'womens-running-shoes-ultralight',
    description:
      "Ultra-lightweight women's running shoes with responsive cushioning, breathable mesh upper, rubber outsole. Reflective details for visibility. Perfect for jogging and gym.",
    shortDescription: 'Ultralight, breathable mesh, responsive cushion',
    sku: 'SPT-WRS-UL-001',
    price: 5999,
    compareAtPrice: 7999,
    costPrice: 3500,
    quantity: 70,
    categorySlug: 'shoes',
    tags: ['running', 'shoes', 'women', 'ultralight', 'sports'],
    isFeatured: false,
    weight: 0.23,
    images: [
      'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Xiaomi Mi Band 8 Fitness Tracker',
    slug: 'xiaomi-mi-band-8',
    description:
      'Xiaomi Mi Band 8 with 1.62" AMOLED display, 150+ workout modes, SpO2 monitoring, 16-day battery life, 5ATM water resistant. Sleep and stress tracking.',
    shortDescription: '1.62" AMOLED, 150+ modes, SpO2, 16-day battery',
    sku: 'XIA-MB8-001',
    price: 3499,
    compareAtPrice: 4499,
    costPrice: 2200,
    quantity: 120,
    categorySlug: 'smart-watches',
    brandSlug: 'xiaomi',
    tags: ['xiaomi', 'mi-band', 'fitness', 'tracker', 'smartwatch'],
    isFeatured: false,
    weight: 0.027,
    images: [
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Instant Noodles Variety Box (24 packs)',
    slug: 'instant-noodles-variety-24pack',
    description:
      'Assorted instant noodles variety box, 24 packs. Includes masala, chicken, prawn, and vegetable flavors from top Bangladeshi brands. Quick meal solution.',
    shortDescription: '24 packs, 4 flavors, instant, variety box',
    sku: 'GRC-NDLS-VAR-24',
    price: 720,
    compareAtPrice: 840,
    costPrice: 500,
    quantity: 400,
    categorySlug: 'snacks',
    tags: ['noodles', 'instant', 'snacks', 'variety', 'food'],
    isFeatured: false,
    weight: 1.8,
    images: [
      'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Maybelline Fit Me Foundation',
    slug: 'maybelline-fit-me-foundation',
    description:
      'Maybelline Fit Me Matte + Poreless foundation. Lightweight oil-free formula, blurs pores, controls shine. Available in 40 shades. Dermatologist tested.',
    shortDescription: 'Matte + Poreless, oil-free, 40 shades',
    sku: 'BH-MAYB-FTM-001',
    price: 1350,
    compareAtPrice: 1599,
    costPrice: 900,
    quantity: 180,
    categorySlug: 'makeup',
    tags: ['maybelline', 'foundation', 'matte', 'makeup', 'beauty'],
    isFeatured: false,
    weight: 0.11,
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Dettol Antibacterial Handwash 1L (2 Pack)',
    slug: 'dettol-handwash-1l-2pack',
    description:
      'Dettol antibacterial liquid handwash 1L refill pack of 2. Kills 99.9% germs. Moisturizing formula with glycerin. Suitable for the whole family.',
    shortDescription: '2x 1L refill, kills 99.9% germs, moisturizing',
    sku: 'UNI-DETTOL-HW-2PK',
    price: 550,
    compareAtPrice: 660,
    costPrice: 380,
    quantity: 350,
    categorySlug: 'skincare',
    brandSlug: 'unilever',
    tags: ['dettol', 'handwash', 'antibacterial', 'hygiene'],
    isFeatured: false,
    weight: 2.1,
    images: [
      'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9e?w=800&h=800&fit=crop&q=80',
    ],
  },

  // -------------------------------------------------------------------------
  // Category coverage fillers — ensure every leaf category has >=3 products
  // so /categories, /categories/[slug], /shop and /deals pages all render.
  // -------------------------------------------------------------------------

  // --- Tablets ---
  {
    name: 'Samsung Galaxy Tab A9+',
    nameBn: 'স্যামসাং গ্যালাক্সি ট্যাব এ৯+',
    slug: 'samsung-galaxy-tab-a9-plus',
    description:
      'Samsung Galaxy Tab A9+ with 11" 90Hz display, Snapdragon 695, quad speakers, 7040mAh battery. Great for streaming, study and light gaming.',
    shortDescription: '11" 90Hz, SD 695, quad speakers, 7040mAh',
    sku: 'SAM-TABA9P-001',
    price: 29999,
    compareAtPrice: 33999,
    costPrice: 24000,
    quantity: 80,
    categorySlug: 'tablets',
    brandSlug: 'samsung',
    tags: ['samsung', 'tablet', 'galaxy-tab', 'android'],
    isFeatured: true,
    weight: 0.48,
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Xiaomi Redmi Pad SE',
    slug: 'xiaomi-redmi-pad-se',
    description:
      'Redmi Pad SE with 11" 90Hz FHD+ display, Snapdragon 680, 8000mAh battery, quad Dolby Atmos speakers. Smooth everyday tablet.',
    shortDescription: '11" 90Hz, SD 680, 8000mAh, Dolby Atmos',
    sku: 'XIA-RPSE-001',
    price: 21999,
    compareAtPrice: 24999,
    costPrice: 17000,
    quantity: 95,
    categorySlug: 'tablets',
    brandSlug: 'xiaomi',
    tags: ['xiaomi', 'redmi', 'tablet', 'budget'],
    isFeatured: false,
    weight: 0.478,
    images: ['https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&h=800&fit=crop&q=80'],
  },

  // --- Cameras ---
  {
    name: 'Canon EOS 200D II DSLR',
    nameBn: 'ক্যানন ইওএস ২০০ডি II ডিএসএলআর',
    slug: 'canon-eos-200d-ii',
    description:
      'Canon EOS 200D II DSLR with 24.1MP APS-C sensor, DIGIC 8, 4K video, vari-angle touchscreen, Dual Pixel AF. Includes EF-S 18-55mm lens.',
    shortDescription: '24.1MP, 4K, vari-angle, w/ 18-55mm kit lens',
    sku: 'CAN-200DII-KIT',
    price: 74999,
    compareAtPrice: 82999,
    costPrice: 62000,
    quantity: 30,
    categorySlug: 'cameras',
    brandSlug: 'canon',
    tags: ['canon', 'dslr', 'camera', '4k', 'beginner'],
    isFeatured: true,
    weight: 0.45,
    images: [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Sony ZV-1 Vlog Camera',
    slug: 'sony-zv-1-vlog-camera',
    description:
      'Sony ZV-1 compact vlog camera with 1" sensor, ZEISS 24-70mm f/1.8-2.8 lens, side-flip screen, directional 3-capsule mic. Perfect for creators.',
    shortDescription: '1" sensor, flip screen, directional mic, 4K',
    sku: 'SON-ZV1-001',
    price: 79999,
    compareAtPrice: 87999,
    costPrice: 68000,
    quantity: 20,
    categorySlug: 'cameras',
    brandSlug: 'sony',
    tags: ['sony', 'camera', 'vlog', 'content-creator', '4k'],
    isFeatured: true,
    weight: 0.294,
    images: [
      'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Rice & Flour ---
  {
    name: 'Pran Miniket Rice 25kg',
    nameBn: 'প্রাণ মিনিকেট চাল ২৫ কেজি',
    slug: 'pran-miniket-rice-25kg',
    description:
      'Pran premium miniket rice, 25kg family pack. Polished long-grain rice, machine cleaned, ideal for everyday meals.',
    shortDescription: 'Premium miniket, long-grain, 25kg family pack',
    sku: 'PRN-RICE-MK-25KG',
    price: 1950,
    compareAtPrice: 2150,
    costPrice: 1600,
    quantity: 250,
    categorySlug: 'rice-flour',
    brandSlug: 'pran',
    tags: ['pran', 'rice', 'miniket', 'staple'],
    isFeatured: false,
    weight: 25,
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'ACI Pure Atta 2kg',
    slug: 'aci-pure-atta-2kg',
    description:
      'ACI Pure whole-wheat atta, 2kg. Finely ground for soft rotis and parathas. Packaged in a food-grade hygienic pack.',
    shortDescription: 'Whole wheat, fine grind, 2kg pack',
    sku: 'ACI-ATTA-2KG',
    price: 160,
    compareAtPrice: 180,
    costPrice: 120,
    quantity: 600,
    categorySlug: 'rice-flour',
    brandSlug: 'aci',
    tags: ['aci', 'atta', 'wheat', 'staple'],
    isFeatured: false,
    weight: 2,
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Spices ---
  {
    name: 'Radhuni Mixed Masala Pack (5 items)',
    slug: 'radhuni-mixed-masala-pack',
    description:
      'Radhuni mixed masala set — garam masala, biryani masala, meat masala, chicken masala and kebab masala, 50g each. Traditional Bangladeshi blends.',
    shortDescription: '5 masalas, 50g each, authentic blends',
    sku: 'RAD-MSL-PK5',
    price: 340,
    compareAtPrice: 420,
    costPrice: 240,
    quantity: 400,
    categorySlug: 'spices',
    tags: ['radhuni', 'spices', 'masala', 'biryani', 'cooking'],
    isFeatured: false,
    weight: 0.3,
    images: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Square Pure Red Chilli Powder 500g',
    slug: 'square-red-chilli-powder-500g',
    description:
      'Square Pure red chilli powder, 500g. Stone-ground for maximum colour and aroma. No artificial colour, no preservatives.',
    shortDescription: 'Stone-ground, pure, 500g pack',
    sku: 'SQR-CHILLI-500G',
    price: 220,
    compareAtPrice: 250,
    costPrice: 150,
    quantity: 450,
    categorySlug: 'spices',
    tags: ['square', 'chilli', 'spice', 'pure'],
    isFeatured: false,
    weight: 0.5,
    images: [
      'https://images.unsplash.com/photo-1599909533730-3ff09eac3bf6?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Bedding ---
  {
    name: 'Classical Hometex Queen Comforter Set',
    slug: 'classical-queen-comforter-set',
    description:
      'Queen-size comforter set, 5 pieces. Microfiber fill with 220-thread-count cotton shell, 2 pillow shams, 2 decorative cushions.',
    shortDescription: '5 pcs, microfiber, 220 TC cotton shell',
    sku: 'HTX-COMF-Q-5PC',
    price: 4800,
    compareAtPrice: 5999,
    costPrice: 3400,
    quantity: 55,
    categorySlug: 'bedding',
    tags: ['bedding', 'comforter', 'queen', 'cotton', 'home'],
    isFeatured: false,
    weight: 2.2,
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Memory Foam Pillow 2-Pack',
    slug: 'memory-foam-pillow-2pack',
    description:
      'Ergonomic memory foam pillow, pack of 2. Contoured shape for neck support, breathable bamboo cover, hypoallergenic.',
    shortDescription: 'Contoured memory foam, bamboo cover, 2 pcs',
    sku: 'BED-MFP-2PK',
    price: 1800,
    compareAtPrice: 2400,
    costPrice: 1200,
    quantity: 110,
    categorySlug: 'bedding',
    tags: ['pillow', 'memory-foam', 'bedding', 'ergonomic'],
    isFeatured: true,
    weight: 1.8,
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Hair care ---
  {
    name: 'Dove Intense Repair Shampoo 650ml',
    slug: 'dove-intense-repair-shampoo-650ml',
    description:
      'Dove Intense Repair shampoo 650ml — Keratin Actives help repair damaged hair from within. Salon-quality care for everyday use.',
    shortDescription: 'Keratin Actives, 650ml, repair damaged hair',
    sku: 'UNI-DOVE-SHP-650',
    price: 640,
    compareAtPrice: 780,
    costPrice: 420,
    quantity: 280,
    categorySlug: 'hair-care',
    brandSlug: 'unilever',
    tags: ['dove', 'shampoo', 'hair', 'keratin'],
    isFeatured: false,
    weight: 0.7,
    images: [
      'https://images.unsplash.com/photo-1526045478516-99145907023c?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Parachute Advansed Coconut Hair Oil 300ml',
    slug: 'parachute-advansed-hair-oil-300ml',
    description:
      'Parachute Advansed pure coconut hair oil, 300ml. Deeply nourishes roots, strengthens hair and reduces hair fall.',
    shortDescription: 'Pure coconut oil, 300ml, anti-hair-fall',
    sku: 'PAR-ADV-300',
    price: 280,
    compareAtPrice: 320,
    costPrice: 200,
    quantity: 500,
    categorySlug: 'hair-care',
    tags: ['parachute', 'hair-oil', 'coconut', 'hair-care'],
    isFeatured: false,
    weight: 0.33,
    images: [
      'https://images.unsplash.com/photo-1571781565057-47b30e0b4f52?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Personal care ---
  {
    name: 'Gillette Mach3 Razor + 4 Cartridges',
    slug: 'gillette-mach3-razor-pack',
    description:
      'Gillette Mach3 razor with 1 handle and 4 triple-blade cartridges. Pivoting head and lubricating strip for a close, smooth shave.',
    shortDescription: 'Handle + 4 triple-blade cartridges',
    sku: 'GIL-M3-PK5',
    price: 790,
    compareAtPrice: 950,
    costPrice: 520,
    quantity: 220,
    categorySlug: 'personal-care',
    tags: ['gillette', 'razor', 'shaving', 'personal-care', 'mens'],
    isFeatured: false,
    weight: 0.15,
    images: [
      'https://images.unsplash.com/photo-1589782182703-2aaa69037b5b?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Colgate MaxFresh Toothpaste 150g (2 Pack)',
    slug: 'colgate-maxfresh-150g-2pack',
    description:
      'Colgate MaxFresh with cooling crystals, 150g x 2. 12-hour fresh breath, fights plaque and cavities.',
    shortDescription: '2 x 150g, cooling crystals, 12hr freshness',
    sku: 'COL-MAXFRESH-2PK',
    price: 340,
    compareAtPrice: 400,
    costPrice: 230,
    quantity: 450,
    categorySlug: 'personal-care',
    tags: ['colgate', 'toothpaste', 'oral-care', 'personal-care'],
    isFeatured: false,
    weight: 0.35,
    images: ['https://images.unsplash.com/photo-1559591935-c6a8a7e3a8ca?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Nivea Men Deep Deodorant 150ml',
    slug: 'nivea-men-deep-deo-150ml',
    description:
      'Nivea Men Deep antibacterial deodorant spray, 150ml. 48-hour odour protection with black charcoal formula.',
    shortDescription: '48hr protection, black charcoal, 150ml',
    sku: 'NIV-DEEP-150',
    price: 420,
    compareAtPrice: 520,
    costPrice: 280,
    quantity: 300,
    categorySlug: 'personal-care',
    tags: ['nivea', 'deodorant', 'mens', 'personal-care'],
    isFeatured: false,
    weight: 0.18,
    images: [
      'https://images.unsplash.com/photo-1585238342028-4bbc1c5f5d2f?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Baby food ---
  {
    name: 'Cerelac Wheat-Apple 400g',
    nameBn: 'সেরেলাক গম-আপেল ৪০০ গ্রাম',
    slug: 'cerelac-wheat-apple-400g',
    description:
      'Nestlé Cerelac wheat-apple baby cereal, 400g. Fortified with iron and 12 essential vitamins & minerals for babies 6+ months.',
    shortDescription: '6m+, iron-fortified, wheat-apple, 400g',
    sku: 'NES-CRL-WA-400',
    price: 620,
    compareAtPrice: 720,
    costPrice: 460,
    quantity: 260,
    categorySlug: 'baby-food',
    tags: ['nestle', 'cerelac', 'baby-food', 'cereal'],
    isFeatured: true,
    weight: 0.42,
    images: ['https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&h=800&fit=crop&q=80'],
  },
  {
    name: 'Lactogen 2 Follow-up Formula 400g',
    slug: 'lactogen-2-400g',
    description:
      'Nestlé Lactogen 2 follow-up infant formula, 400g. Designed for 6+ month infants; contains DHA, iron and probiotics.',
    shortDescription: '6m+, DHA & probiotics, 400g tin',
    sku: 'NES-LG2-400',
    price: 850,
    compareAtPrice: 950,
    costPrice: 640,
    quantity: 200,
    categorySlug: 'baby-food',
    tags: ['nestle', 'lactogen', 'baby-food', 'formula'],
    isFeatured: false,
    weight: 0.44,
    images: [
      'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Gerber Organic Fruit Puree Pouch 6-Pack',
    slug: 'gerber-fruit-puree-6pack',
    description:
      'Gerber organic fruit puree variety pack — apple, pear, banana, mango flavours. 6 x 90g pouches. No added sugar or preservatives.',
    shortDescription: '6 x 90g pouches, organic, no added sugar',
    sku: 'GRB-PURE-6PK',
    price: 990,
    compareAtPrice: 1200,
    costPrice: 720,
    quantity: 140,
    categorySlug: 'baby-food',
    tags: ['gerber', 'baby-food', 'organic', 'puree'],
    isFeatured: false,
    weight: 0.6,
    images: [
      'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Toys ---
  {
    name: 'LEGO Classic Creative Bricks 484 Pcs',
    slug: 'lego-classic-creative-484',
    description:
      'LEGO Classic Creative Bricks 10696 — 484 colourful pieces for open-ended building fun. Ages 4+. Compatible with all LEGO sets.',
    shortDescription: '484 pcs, ages 4+, creative building set',
    sku: 'LEG-10696-484',
    price: 3499,
    compareAtPrice: 4200,
    costPrice: 2500,
    quantity: 70,
    categorySlug: 'toys',
    tags: ['lego', 'toys', 'building', 'kids', 'educational'],
    isFeatured: true,
    weight: 0.9,
    images: [
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Remote Control Racing Car (Rechargeable)',
    slug: 'rc-racing-car-rechargeable',
    description:
      'Rechargeable RC racing car with 2.4GHz remote, ~20 km/h top speed, shock-absorbing tyres. Play time ~40 min per charge.',
    shortDescription: '2.4GHz, rechargeable, 20km/h, kids 6+',
    sku: 'TOY-RC-CAR-001',
    price: 1850,
    compareAtPrice: 2400,
    costPrice: 1200,
    quantity: 120,
    categorySlug: 'toys',
    tags: ['toys', 'remote-control', 'car', 'kids'],
    isFeatured: false,
    weight: 0.7,
    images: [
      'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Automotive ---
  {
    name: 'Bosch S4 Car Battery 60Ah',
    slug: 'bosch-s4-battery-60ah',
    description:
      'Bosch S4 12V 60Ah maintenance-free car battery. Suits most 1.3L-1.8L sedans. 24-month local warranty.',
    shortDescription: '12V 60Ah, maintenance-free, 24-mo warranty',
    sku: 'BSH-S4-60AH',
    price: 11500,
    compareAtPrice: 13200,
    costPrice: 9200,
    quantity: 40,
    categorySlug: 'automotive',
    tags: ['bosch', 'battery', 'car', 'automotive'],
    isFeatured: false,
    weight: 15,
    images: [
      'https://images.unsplash.com/photo-1597766353939-bafa7e4d1ba2?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Michelin Car Tyre 185/65 R15',
    slug: 'michelin-tyre-185-65-r15',
    description:
      'Michelin Energy XM2+ 185/65 R15 tubeless tyre. Long-lasting tread, fuel-efficient compound, excellent wet grip.',
    shortDescription: '185/65 R15 tubeless, fuel-efficient',
    sku: 'MCH-XM2P-185-65-15',
    price: 8900,
    compareAtPrice: 9800,
    costPrice: 7000,
    quantity: 60,
    categorySlug: 'automotive',
    tags: ['michelin', 'tyre', 'car', 'automotive'],
    isFeatured: true,
    weight: 7.5,
    images: [
      'https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Xenon Car LED Headlight Pair H4',
    slug: 'car-led-headlight-h4-pair',
    description:
      'Upgrade LED headlight bulbs H4, 60W, 6000K white, pair. Plug-and-play fit with built-in cooling fan.',
    shortDescription: 'H4, 60W, 6000K, plug-and-play, pair',
    sku: 'CAR-LED-H4-PR',
    price: 2200,
    compareAtPrice: 2800,
    costPrice: 1500,
    quantity: 150,
    categorySlug: 'automotive',
    tags: ['led', 'headlight', 'car', 'automotive', 'accessory'],
    isFeatured: false,
    weight: 0.4,
    images: [
      'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&h=800&fit=crop&q=80',
    ],
  },

  // --- Pets ---
  {
    name: 'Whiskas Adult Cat Food Ocean Fish 1.2kg',
    slug: 'whiskas-adult-ocean-fish-1-2kg',
    description:
      'Whiskas adult (1+) dry cat food, ocean fish flavour, 1.2kg. Complete and balanced nutrition with taurine, omega-6 and vitamins.',
    shortDescription: '1+ adult cats, ocean fish, 1.2kg',
    sku: 'WHK-OCFISH-1200',
    price: 850,
    compareAtPrice: 980,
    costPrice: 620,
    quantity: 180,
    categorySlug: 'pets',
    tags: ['whiskas', 'cat-food', 'pets', 'adult-cat'],
    isFeatured: true,
    weight: 1.25,
    images: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Pedigree Adult Dog Food Chicken 3kg',
    slug: 'pedigree-adult-chicken-3kg',
    description:
      'Pedigree adult dog food with real chicken, 3kg. 100% complete nutrition for healthy digestion, skin and coat.',
    shortDescription: 'Adult dogs, real chicken, 3kg',
    sku: 'PED-CHK-3KG',
    price: 1250,
    compareAtPrice: 1450,
    costPrice: 950,
    quantity: 140,
    categorySlug: 'pets',
    tags: ['pedigree', 'dog-food', 'pets', 'adult-dog'],
    isFeatured: false,
    weight: 3.1,
    images: [
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=800&fit=crop&q=80',
    ],
  },
  {
    name: 'Pet Grooming Brush Self-Cleaning',
    slug: 'pet-grooming-brush-self-cleaning',
    description:
      'Self-cleaning slicker brush for cats and dogs. Retractable bristles, one-button fur release, comfortable rubber grip.',
    shortDescription: 'Self-cleaning slicker brush, 1-button release',
    sku: 'PET-BRSH-SC-001',
    price: 590,
    compareAtPrice: 790,
    costPrice: 380,
    quantity: 220,
    categorySlug: 'pets',
    tags: ['pets', 'grooming', 'brush', 'cat', 'dog'],
    isFeatured: false,
    weight: 0.18,
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop&q=80',
    ],
  },
];

async function seedProducts(brandMap: Record<string, string>) {
  console.log('Seeding products...');
  let count = 0;

  for (const p of PRODUCTS) {
    // Resolve category
    const category = await prisma.category.findUnique({
      where: { slug: p.categorySlug },
    });
    if (!category) {
      console.warn(`  Skipping "${p.name}" — category "${p.categorySlug}" not found`);
      continue;
    }

    const brandId = p.brandSlug ? (brandMap[p.brandSlug] ?? null) : null;

    // Upsert product (update existing records with latest seed data)
    const productData = {
      name: p.name,
      nameBn: p.nameBn,
      slug: p.slug,
      description: p.description,
      descriptionBn: p.descriptionBn,
      shortDescription: p.shortDescription,
      sku: p.sku,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      costPrice: p.costPrice,
      quantity: p.quantity,
      status: 'ACTIVE' as const,
      categoryId: category.id,
      brandId,
      tags: p.tags,
      isFeatured: p.isFeatured,
      weight: p.weight,
      weightUnit: 'kg',
      averageRating: +(3.5 + Math.random() * 1.4).toFixed(1),
      totalReviews: Math.floor(10 + Math.random() * 290),
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: productData,
      create: productData,
    });

    // Replace images for this product — delete any that aren't in the
    // current seed list, then upsert the current ones so re-seeding is
    // idempotent even if image metadata was changed by hand.
    const seededImages = await seedImages(p.images, 'products');
    const keepIds = seededImages.map((_, i) => `seed-img-${p.slug}-${i}`);
    await prisma.productImage.deleteMany({
      where: { productId: product.id, id: { notIn: keepIds } },
    });
    for (let i = 0; i < seededImages.length; i++) {
      const fullUrl = seededImages[i]!;
      await prisma.productImage.upsert({
        where: { id: `seed-img-${p.slug}-${i}` },
        update: {
          productId: product.id,
          url: fullUrl,
          thumbnailUrl: toThumbnailUrl(fullUrl),
          alt: p.name,
          isPrimary: i === 0,
          sortOrder: i,
        },
        create: {
          id: `seed-img-${p.slug}-${i}`,
          productId: product.id,
          url: fullUrl,
          thumbnailUrl: toThumbnailUrl(fullUrl),
          alt: p.name,
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }

    // Seed variants
    if (p.variants) {
      for (let v = 0; v < p.variants.length; v++) {
        const variant = p.variants[v];
        await prisma.productVariant.upsert({
          where: { sku: variant.sku },
          update: {},
          create: {
            productId: product.id,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            quantity: variant.quantity,
            isActive: true,
            sortOrder: v,
          },
        });
      }
    }

    // Seed inventory
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: p.quantity,
        reservedQuantity: 0,
        lowStockThreshold: p.quantity > 100 ? 20 : 5,
        trackInventory: true,
        allowBackorder: false,
      },
    });

    count++;
  }

  console.log(`  Seeded ${count} products with images, variants & inventory`);
}

// ---------------------------------------------------------------------------
// Seed: CMS Pages
// ---------------------------------------------------------------------------
async function seedPages() {
  console.log('Seeding CMS pages...');

  const pages = [
    {
      title: 'About Us',
      titleBn: 'আমাদের সম্পর্কে',
      slug: 'about-us',
      content: `<h1>About ShopBD</h1>
<p>ShopBD is Bangladesh's leading e-commerce platform, connecting millions of buyers with trusted sellers across the country. Founded with a mission to make quality products accessible to every Bangladeshi household, we offer an extensive range of products from electronics and fashion to groceries and home essentials.</p>
<h2>Our Mission</h2>
<p>To empower Bangladeshi consumers and businesses by providing a reliable, affordable, and convenient online shopping experience with support for both Bengali and English.</p>
<h2>Why Choose Us?</h2>
<ul>
  <li>100% authentic products from verified sellers</li>
  <li>Cash on Delivery across Bangladesh</li>
  <li>bKash, Nagad & Rocket payment support</li>
  <li>Fast delivery inside Dhaka (24-48 hours)</li>
  <li>Bilingual support in Bengali and English</li>
  <li>Easy returns within 7 days</li>
</ul>`,
      contentBn: `<h1>শপবিডি সম্পর্কে</h1>
<p>শপবিডি বাংলাদেশের শীর্ষস্থানীয় ই-কমার্স প্ল্যাটফর্ম। লক্ষ লক্ষ ক্রেতাকে বিশ্বস্ত বিক্রেতাদের সাথে সংযুক্ত করে সারাদেশে মানসম্মত পণ্য সহজলভ্য করাই আমাদের লক্ষ্য।</p>`,
      excerpt: "Bangladesh's leading e-commerce platform for quality products at the best prices.",
      status: 'PUBLISHED' as const,
      metaTitle: 'About ShopBD | Trusted E-commerce in Bangladesh',
      metaDescription:
        "Learn about ShopBD — Bangladesh's leading e-commerce platform offering authentic products with fast delivery and bilingual support.",
    },
    {
      title: 'Contact Us',
      titleBn: 'যোগাযোগ করুন',
      slug: 'contact-us',
      content: `<h1>Contact Us</h1>
<p>We'd love to hear from you! Reach out to our customer support team for any queries, feedback, or assistance.</p>
<h2>Customer Support</h2>
<ul>
  <li><strong>Phone:</strong> +880-2-1234-5678 (9 AM - 10 PM, Saturday - Thursday)</li>
  <li><strong>Email:</strong> support@shopbd.com</li>
  <li><strong>WhatsApp:</strong> +880-1700-000-000</li>
</ul>
<h2>Office Address</h2>
<p>ShopBD Technologies Ltd.<br>
Level 12, Rangs Babylon Tower<br>
246 Bir Uttam Mir Shawkat Road<br>
Tejgaon, Dhaka 1208, Bangladesh</p>
<h2>Business Hours</h2>
<p>Saturday — Thursday: 9:00 AM — 6:00 PM<br>Friday: Closed</p>`,
      contentBn: `<h1>যোগাযোগ করুন</h1>
<p>আমরা আপনার কাছ থেকে শুনতে চাই! যেকোনো প্রশ্ন, মতামত বা সহায়তার জন্য আমাদের কাস্টমার সাপোর্ট টিমের সাথে যোগাযোগ করুন।</p>`,
      excerpt: 'Get in touch with ShopBD customer support team.',
      status: 'PUBLISHED' as const,
      metaTitle: 'Contact Us | ShopBD Customer Support',
      metaDescription:
        'Contact ShopBD customer support via phone, email, or WhatsApp. We are here to help with your orders and queries.',
    },
    {
      title: 'Privacy Policy',
      titleBn: 'গোপনীয়তা নীতি',
      slug: 'privacy-policy',
      content: `<h1>Privacy Policy</h1>
<p>Last updated: December 15, 2025</p>
<p>ShopBD Technologies Ltd. ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
<h2>1. Information We Collect</h2>
<p>We collect personal information that you voluntarily provide when you register, place an order, subscribe to our newsletter, or contact us. This includes: name, email address, phone number, shipping and billing addresses, payment information, and order history.</p>
<h2>2. How We Use Your Information</h2>
<p>We use your information to: process orders, send order updates, provide customer support, personalize your shopping experience, send promotional offers (with your consent), prevent fraud, and comply with legal obligations.</p>
<h2>3. Data Security</h2>
<p>We implement industry-standard security measures including SSL encryption, secure payment gateways, and regular security audits to protect your data.</p>
<h2>4. Third-Party Sharing</h2>
<p>We do not sell your personal data. We share information only with: payment processors (bKash, Nagad, Stripe), delivery partners, and as required by Bangladeshi law.</p>
<h2>5. Your Rights</h2>
<p>You may request access to, correction of, or deletion of your personal data by contacting us at privacy@shopbd.com.</p>`,
      excerpt: 'How we collect, use, and protect your personal information.',
      status: 'PUBLISHED' as const,
      metaTitle: 'Privacy Policy | ShopBD',
      metaDescription:
        'Read the ShopBD Privacy Policy to understand how we collect, use, and protect your personal information.',
    },
    {
      title: 'Terms & Conditions',
      titleBn: 'শর্তাবলী',
      slug: 'terms-conditions',
      content: `<h1>Terms & Conditions</h1>
<p>Last updated: December 15, 2025</p>
<p>Welcome to ShopBD. By accessing and using our website and services, you agree to be bound by these Terms & Conditions. Please read them carefully.</p>
<h2>1. Account Registration</h2>
<p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
<h2>2. Orders & Payments</h2>
<p>All prices are displayed in Bangladeshi Taka (BDT) and include applicable taxes unless stated otherwise. We reserve the right to refuse or cancel any order for reasons including pricing errors, stock unavailability, or suspected fraud.</p>
<h2>3. Shipping & Delivery</h2>
<p>Delivery timelines are estimates and may vary based on location and circumstances. Inside Dhaka: 24-48 hours. Outside Dhaka: 3-5 business days. Remote areas may take longer.</p>
<h2>4. Returns & Refunds</h2>
<p>Products may be returned within 7 days of delivery if they are unused, in original packaging, and accompanied by the invoice. Refunds will be processed within 5-7 business days.</p>
<h2>5. Limitation of Liability</h2>
<p>ShopBD shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.</p>`,
      excerpt: 'Terms governing the use of ShopBD services.',
      status: 'PUBLISHED' as const,
      metaTitle: 'Terms & Conditions | ShopBD',
      metaDescription: 'Read the Terms & Conditions for using ShopBD e-commerce platform.',
    },
    {
      title: 'Refund Policy',
      titleBn: 'ফেরত নীতি',
      slug: 'refund-policy',
      content: `<h1>Refund & Return Policy</h1>
<p>Last updated: December 15, 2025</p>
<p>At ShopBD, we want you to be completely satisfied with your purchase. If you are not happy with your order, we offer a hassle-free return and refund policy.</p>
<h2>Return Window</h2>
<p>You may return most items within 7 days of delivery. Some categories (underwear, perishable goods, digital products) are non-returnable.</p>
<h2>Return Conditions</h2>
<ul>
  <li>Item must be unused and in its original packaging</li>
  <li>All tags and labels must be intact</li>
  <li>Original invoice or order confirmation must be provided</li>
  <li>Item must not be damaged by the customer</li>
</ul>
<h2>Refund Process</h2>
<p>Once we receive and inspect the returned item, refunds will be processed to the original payment method within 5-7 business days. For Cash on Delivery orders, refunds will be sent via bKash or bank transfer.</p>
<h2>Exchange</h2>
<p>We offer free exchanges for size/color changes subject to availability. Contact our support team to initiate an exchange.</p>`,
      contentBn: `<h1>ফেরত ও রিটার্ন নীতি</h1>
<p>শপবিডি-তে আমরা চাই আপনি আপনার ক্রয়ে সম্পূর্ণ সন্তুষ্ট থাকুন। ৭ দিনের মধ্যে বেশিরভাগ পণ্য ফেরত দেওয়া যাবে।</p>`,
      excerpt: 'Our hassle-free return and refund policy for your peace of mind.',
      status: 'PUBLISHED' as const,
      metaTitle: 'Refund & Return Policy | ShopBD',
      metaDescription:
        'Learn about the ShopBD refund and return policy. Easy returns within 7 days with hassle-free refunds.',
    },
  ];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        ...page,
        sortOrder: i,
      },
    });
  }

  console.log(`  Seeded ${pages.length} CMS pages`);
}

// ---------------------------------------------------------------------------
// Seed: Banners
// ---------------------------------------------------------------------------
// Banner source URLs — Unsplash photos chosen to match each banner's theme.
const BANNER_SOURCES = {
  eid: 'https://images.unsplash.com/photo-1588436706487-9d55d73a39e3?w=1600&h=800&fit=crop&q=80',
  eidMobile:
    'https://images.unsplash.com/photo-1588436706487-9d55d73a39e3?w=800&h=600&fit=crop&q=80',
  electronics:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=800&fit=crop&q=80',
  electronicsMobile:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&q=80',
  delivery:
    'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1600&h=800&fit=crop&q=80',
  deliveryMobile:
    'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&h=600&fit=crop&q=80',
  smartphone:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=1000&fit=crop&q=80',
  app: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=600&fit=crop&q=80',
};

async function seedBanners() {
  console.log('Seeding banners...');

  const [
    eid,
    eidMobile,
    electronics,
    electronicsMobile,
    delivery,
    deliveryMobile,
    smartphone,
    app,
  ] = await seedImages(
    [
      BANNER_SOURCES.eid,
      BANNER_SOURCES.eidMobile,
      BANNER_SOURCES.electronics,
      BANNER_SOURCES.electronicsMobile,
      BANNER_SOURCES.delivery,
      BANNER_SOURCES.deliveryMobile,
      BANNER_SOURCES.smartphone,
      BANNER_SOURCES.app,
    ],
    'banners',
  );

  const banners = [
    {
      title: 'Eid Collection 2025',
      titleBn: 'ঈদ কালেকশন ২০২৫',
      image: eid!,
      mobileImage: eidMobile!,
      link: '/collections/eid-2025',
      position: 'HERO' as const,
      isActive: true,
      sortOrder: 0,
    },
    {
      title: 'Electronics Mega Sale',
      titleBn: 'ইলেকট্রনিক্স মেগা সেল',
      image: electronics!,
      mobileImage: electronicsMobile!,
      link: '/category/electronics?sale=true',
      position: 'HERO' as const,
      isActive: true,
      sortOrder: 1,
    },
    {
      title: 'Free Delivery Inside Dhaka',
      titleBn: 'ঢাকায় ফ্রি ডেলিভারি',
      image: delivery!,
      mobileImage: deliveryMobile!,
      link: '/offers/free-delivery',
      position: 'HERO' as const,
      isActive: true,
      sortOrder: 2,
    },
    {
      title: 'Smartphone Deals',
      titleBn: 'স্মার্টফোন অফার',
      image: smartphone!,
      link: '/category/smartphones',
      position: 'SIDEBAR' as const,
      isActive: true,
      sortOrder: 0,
    },
    {
      title: 'Download Our App',
      titleBn: 'আমাদের অ্যাপ ডাউনলোড করুন',
      image: app!,
      link: '/app',
      position: 'FOOTER' as const,
      isActive: true,
      sortOrder: 0,
    },
  ];

  for (const banner of banners) {
    // Use deterministic ID for idempotent seeding
    const id = `seed-banner-${banner.position.toLowerCase()}-${banner.sortOrder}`;
    await prisma.banner.upsert({
      where: { id },
      update: {
        image: banner.image,
        ...(banner.mobileImage !== undefined ? { mobileImage: banner.mobileImage } : {}),
      },
      create: { id, ...banner },
    });
  }

  console.log(`  Seeded ${banners.length} banners`);
}

// ---------------------------------------------------------------------------
// Seed: Navigation Menus
// ---------------------------------------------------------------------------
async function seedNavigationMenus() {
  console.log('Seeding navigation menus...');

  const headerMenuId = 'seed-nav-header';
  await prisma.navigationMenu.upsert({
    where: { id: headerMenuId },
    update: {},
    create: {
      id: headerMenuId,
      name: 'Main Navigation',
      nameBn: 'প্রধান নেভিগেশন',
      location: 'HEADER',
      isActive: true,
      items: [
        { label: 'Home', labelBn: 'হোম', href: '/', icon: 'Home' },
        {
          label: 'Categories',
          labelBn: 'ক্যাটেগরি',
          href: '/categories',
          icon: 'Grid',
          children: [
            { label: 'Electronics', labelBn: 'ইলেকট্রনিক্স', href: '/category/electronics' },
            { label: 'Fashion', labelBn: 'ফ্যাশন', href: '/category/fashion' },
            { label: 'Home & Living', labelBn: 'হোম ও লিভিং', href: '/category/home-living' },
            { label: 'Beauty & Health', labelBn: 'বিউটি ও হেলথ', href: '/category/beauty-health' },
            { label: 'Groceries', labelBn: 'মুদি দোকান', href: '/category/groceries' },
          ],
        },
        { label: 'Deals', labelBn: 'ডিলস', href: '/deals', icon: 'Percent', highlight: true },
        { label: 'Brands', labelBn: 'ব্র্যান্ড', href: '/brands', icon: 'Award' },
        { label: 'New Arrivals', labelBn: 'নতুন পণ্য', href: '/new-arrivals', icon: 'Sparkles' },
      ],
    },
  });

  const footerMenuId = 'seed-nav-footer';
  await prisma.navigationMenu.upsert({
    where: { id: footerMenuId },
    update: {},
    create: {
      id: footerMenuId,
      name: 'Footer Navigation',
      nameBn: 'ফুটার নেভিগেশন',
      location: 'FOOTER',
      isActive: true,
      items: [
        {
          heading: 'Customer Service',
          headingBn: 'কাস্টমার সার্ভিস',
          links: [
            { label: 'Contact Us', labelBn: 'যোগাযোগ', href: '/page/contact-us' },
            { label: 'FAQs', labelBn: 'প্রশ্নোত্তর', href: '/faqs' },
            { label: 'Track Order', labelBn: 'অর্ডার ট্র্যাক', href: '/track-order' },
            { label: 'Returns & Refunds', labelBn: 'ফেরত ও রিফান্ড', href: '/page/refund-policy' },
          ],
        },
        {
          heading: 'About ShopBD',
          headingBn: 'শপবিডি সম্পর্কে',
          links: [
            { label: 'About Us', labelBn: 'আমাদের সম্পর্কে', href: '/page/about-us' },
            { label: 'Careers', labelBn: 'ক্যারিয়ার', href: '/careers' },
            { label: 'Privacy Policy', labelBn: 'গোপনীয়তা নীতি', href: '/page/privacy-policy' },
            { label: 'Terms & Conditions', labelBn: 'শর্তাবলী', href: '/page/terms-conditions' },
          ],
        },
        {
          heading: 'Payment Methods',
          headingBn: 'পেমেন্ট পদ্ধতি',
          links: [
            { label: 'bKash', href: '/payment/bkash', icon: 'bkash' },
            { label: 'Nagad', href: '/payment/nagad', icon: 'nagad' },
            { label: 'Rocket', href: '/payment/rocket', icon: 'rocket' },
            { label: 'Visa / Mastercard', href: '/payment/cards', icon: 'credit-card' },
            { label: 'Cash on Delivery', labelBn: 'ক্যাশ অন ডেলিভারি', href: '/payment/cod' },
          ],
        },
      ],
    },
  });

  const mobileMenuId = 'seed-nav-mobile';
  await prisma.navigationMenu.upsert({
    where: { id: mobileMenuId },
    update: {},
    create: {
      id: mobileMenuId,
      name: 'Mobile Navigation',
      nameBn: 'মোবাইল নেভিগেশন',
      location: 'MOBILE',
      isActive: true,
      items: [
        { label: 'Home', labelBn: 'হোম', href: '/', icon: 'Home' },
        { label: 'Categories', labelBn: 'ক্যাটেগরি', href: '/categories', icon: 'Grid' },
        { label: 'Cart', labelBn: 'কার্ট', href: '/cart', icon: 'ShoppingCart' },
        { label: 'Wishlist', labelBn: 'পছন্দ', href: '/wishlist', icon: 'Heart' },
        { label: 'Account', labelBn: 'অ্যাকাউন্ট', href: '/account', icon: 'User' },
      ],
    },
  });

  console.log('  Seeded 3 navigation menus (header, footer, mobile)');
}

// ---------------------------------------------------------------------------
// Seed: Shipping Methods
// ---------------------------------------------------------------------------
async function seedShippingMethods() {
  console.log('Seeding shipping methods...');

  const methods = [
    {
      id: 'seed-ship-dhaka',
      name: 'Inside Dhaka',
      nameBn: 'ঢাকার ভিতরে',
      description: 'Standard delivery within Dhaka city (24-48 hours)',
      price: 60,
      freeAbove: 1000,
      estimatedDays: '1-2 days',
      zones: ['Dhaka'],
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'seed-ship-outside',
      name: 'Outside Dhaka',
      nameBn: 'ঢাকার বাইরে',
      description: 'Standard delivery outside Dhaka (3-5 business days)',
      price: 120,
      freeAbove: 2000,
      estimatedDays: '3-5 days',
      zones: ['Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur', 'Barishal', 'Mymensingh'],
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'seed-ship-express',
      name: 'Express Delivery (Dhaka)',
      nameBn: 'এক্সপ্রেস ডেলিভারি (ঢাকা)',
      description: 'Same-day or next-day delivery within Dhaka',
      price: 150,
      estimatedDays: 'Same day / Next day',
      zones: ['Dhaka'],
      isActive: true,
      sortOrder: 2,
    },
  ];

  for (const method of methods) {
    await prisma.shippingMethod.upsert({
      where: { id: method.id },
      update: {},
      create: method,
    });
  }

  console.log(`  Seeded ${methods.length} shipping methods`);
}

// ---------------------------------------------------------------------------
// Seed: Default Settings
// ---------------------------------------------------------------------------
// OG image source — a clean commerce-themed photo used for link previews.
const OG_IMAGE_SOURCE =
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=630&fit=crop&q=80';

async function seedSettings() {
  console.log('Seeding default settings...');

  const ogImageUrl = await seedImage(OG_IMAGE_SOURCE, 'seo');

  const settings: Array<{
    group: 'GENERAL' | 'EMAIL' | 'SHIPPING' | 'TAX' | 'PAYMENT' | 'SEO' | 'SOCIAL';
    key: string;
    value: string;
    type?: string;
  }> = [
    // General
    { group: 'GENERAL', key: 'site_name', value: 'ShopBD' },
    { group: 'GENERAL', key: 'site_name_bn', value: 'শপবিডি' },
    { group: 'GENERAL', key: 'site_tagline', value: "Bangladesh's Trusted Online Shop" },
    { group: 'GENERAL', key: 'site_tagline_bn', value: 'বাংলাদেশের বিশ্বস্ত অনলাইন শপ' },
    { group: 'GENERAL', key: 'currency', value: 'BDT' },
    { group: 'GENERAL', key: 'currency_symbol', value: '৳' },
    { group: 'GENERAL', key: 'currency_position', value: 'before' },
    { group: 'GENERAL', key: 'default_language', value: 'en' },
    { group: 'GENERAL', key: 'supported_languages', value: 'en,bn', type: 'array' },
    { group: 'GENERAL', key: 'timezone', value: 'Asia/Dhaka' },
    { group: 'GENERAL', key: 'date_format', value: 'DD/MM/YYYY' },
    { group: 'GENERAL', key: 'phone', value: '+880-2-1234-5678' },
    { group: 'GENERAL', key: 'support_email', value: 'support@shopbd.com' },
    {
      group: 'GENERAL',
      key: 'address',
      value: 'Level 12, Rangs Babylon Tower, 246 Bir Uttam Mir Shawkat Road, Tejgaon, Dhaka 1208',
    },
    { group: 'GENERAL', key: 'return_policy_days', value: '7', type: 'number' },
    { group: 'GENERAL', key: 'announcement_enabled', value: 'false', type: 'boolean' },
    { group: 'GENERAL', key: 'announcement_text', value: '' },
    { group: 'GENERAL', key: 'announcement_text_bn', value: '' },
    // Default home-page section order. Admin can reorder / toggle
    // visibility / tweak per-section props in /admin/appearance/home.
    // The public home renderer falls back to this shape if parsing
    // fails, so the site never goes blank.
    {
      group: 'GENERAL',
      key: 'home_sections',
      type: 'json',
      value: JSON.stringify([
        { id: 'hero', type: 'hero', visible: true, sortOrder: 0, props: {} },
        {
          id: 'categories',
          type: 'categories',
          visible: true,
          sortOrder: 1,
          props: { heading: 'Shop by Category', limit: 8 },
        },
        {
          id: 'featured',
          type: 'featured_products',
          visible: true,
          sortOrder: 2,
          props: { heading: 'Featured Products', limit: 8 },
        },
        { id: 'promo', type: 'promo_strip', visible: true, sortOrder: 3, props: {} },
        {
          id: 'new',
          type: 'new_arrivals',
          visible: true,
          sortOrder: 4,
          props: { heading: 'New Arrivals', limit: 8 },
        },
        {
          id: 'trust',
          type: 'trust_badges',
          visible: true,
          sortOrder: 5,
          props: {
            badges: [
              { icon: 'truck', title: 'Free Delivery', subtitle: 'On orders over ৳2,000' },
              { icon: 'shield', title: 'Secure Payment', subtitle: 'bKash, Nagad, Cards' },
              { icon: 'refresh', title: 'Easy Returns', subtitle: '7-day return policy' },
              {
                icon: 'flag',
                title: 'Made in Bangladesh',
                subtitle: 'Supporting local businesses',
              },
            ],
          },
        },
        { id: 'newsletter', type: 'newsletter', visible: true, sortOrder: 6, props: {} },
      ]),
    },

    // Email
    { group: 'EMAIL', key: 'from_name', value: 'ShopBD' },
    { group: 'EMAIL', key: 'from_email', value: 'noreply@shopbd.com' },
    { group: 'EMAIL', key: 'smtp_host', value: 'smtp.sendgrid.net' },
    { group: 'EMAIL', key: 'smtp_port', value: '587', type: 'number' },
    { group: 'EMAIL', key: 'smtp_secure', value: 'true', type: 'boolean' },

    // Shipping
    { group: 'SHIPPING', key: 'free_shipping_threshold', value: '2000', type: 'number' },
    { group: 'SHIPPING', key: 'default_weight_unit', value: 'kg' },
    { group: 'SHIPPING', key: 'enable_free_shipping', value: 'true', type: 'boolean' },

    // Tax
    { group: 'TAX', key: 'vat_percentage', value: '15', type: 'number' },
    { group: 'TAX', key: 'vat_included_in_price', value: 'true', type: 'boolean' },
    { group: 'TAX', key: 'vat_registration_number', value: '' },
    { group: 'TAX', key: 'enable_tax', value: 'true', type: 'boolean' },

    // Payment
    { group: 'PAYMENT', key: 'enable_cod', value: 'true', type: 'boolean' },
    { group: 'PAYMENT', key: 'enable_bkash', value: 'true', type: 'boolean' },
    { group: 'PAYMENT', key: 'enable_nagad', value: 'true', type: 'boolean' },
    { group: 'PAYMENT', key: 'enable_rocket', value: 'true', type: 'boolean' },
    { group: 'PAYMENT', key: 'enable_stripe', value: 'false', type: 'boolean' },
    { group: 'PAYMENT', key: 'cod_extra_charge', value: '0', type: 'number' },
    { group: 'PAYMENT', key: 'min_order_amount', value: '100', type: 'number' },
    { group: 'PAYMENT', key: 'max_cod_amount', value: '50000', type: 'number' },

    // SEO
    {
      group: 'SEO',
      key: 'meta_title',
      value: "ShopBD — Bangladesh's #1 Online Shopping Destination",
    },
    {
      group: 'SEO',
      key: 'meta_description',
      value:
        'Shop online at ShopBD for electronics, fashion, groceries & more. Free delivery in Dhaka, Cash on Delivery, bKash & Nagad payment. Trusted by millions.',
    },
    {
      group: 'SEO',
      key: 'meta_keywords',
      value: 'online shopping bangladesh, e-commerce bd, buy online dhaka, shopbd',
      type: 'array',
    },
    { group: 'SEO', key: 'google_analytics_id', value: '' },
    { group: 'SEO', key: 'facebook_pixel_id', value: '' },
    { group: 'SEO', key: 'og_image', value: ogImageUrl },

    // Social
    { group: 'SOCIAL', key: 'facebook_url', value: 'https://facebook.com/shopbd' },
    { group: 'SOCIAL', key: 'instagram_url', value: 'https://instagram.com/shopbd' },
    { group: 'SOCIAL', key: 'youtube_url', value: 'https://youtube.com/@shopbd' },
    { group: 'SOCIAL', key: 'twitter_url', value: '' },
    { group: 'SOCIAL', key: 'tiktok_url', value: '' },
    { group: 'SOCIAL', key: 'whatsapp_number', value: '+8801700000000' },
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: {
        group_key: { group: s.group, key: s.key },
      },
      update: { value: s.value, type: s.type ?? 'string' },
      create: {
        group: s.group,
        key: s.key,
        value: s.value,
        type: s.type ?? 'string',
      },
    });
  }

  console.log(`  Seeded ${settings.length} settings`);
}

// ---------------------------------------------------------------------------
// Seed: Email Templates
// ---------------------------------------------------------------------------
async function seedEmailTemplates() {
  console.log('Seeding email templates...');

  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to ShopBD! 🎉',
      subjectBn: 'শপবিডি-তে স্বাগতম! 🎉',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">Welcome to ShopBD!</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">Thank you for creating your ShopBD account! You are now ready to explore thousands of products at the best prices.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{shopUrl}}" style="background: #0f766e; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Start Shopping</a>
      </div>
      <p style="font-size: 14px; color: #64748b;">If you have any questions, reply to this email or contact us at support@shopbd.com.</p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: ['firstName', 'shopUrl', 'year'],
    },
    {
      name: 'order_confirmation',
      subject: 'Order Confirmed — #{{orderNumber}}',
      subjectBn: 'অর্ডার নিশ্চিত হয়েছে — #{{orderNumber}}',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Order Confirmed! ✓</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">Order #{{orderNumber}}</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">Your order has been confirmed and is being processed. Here is a summary:</p>
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">Items:</td><td style="text-align: right; font-weight: 600;">{{itemCount}} items</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Subtotal:</td><td style="text-align: right;">৳{{subtotal}}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Shipping:</td><td style="text-align: right;">৳{{shippingCost}}</td></tr>
          <tr style="border-top: 2px solid #e2e8f0;"><td style="padding: 12px 0; font-weight: 700; font-size: 18px;">Total:</td><td style="text-align: right; font-weight: 700; font-size: 18px; color: #0f766e;">৳{{totalAmount}}</td></tr>
        </table>
      </div>
      <p style="font-size: 14px; color: #64748b;"><strong>Delivery Address:</strong> {{shippingAddress}}</p>
      <p style="font-size: 14px; color: #64748b;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{trackingUrl}}" style="background: #0f766e; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Track Your Order</a>
      </div>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: [
        'firstName',
        'orderNumber',
        'itemCount',
        'subtotal',
        'shippingCost',
        'totalAmount',
        'shippingAddress',
        'paymentMethod',
        'trackingUrl',
        'year',
      ],
    },
    {
      name: 'order_shipped',
      subject: 'Your Order #{{orderNumber}} Has Been Shipped!',
      subjectBn: 'আপনার অর্ডার #{{orderNumber}} শিপ করা হয়েছে!',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Your Order is On Its Way! 🚚</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">Great news! Your order #{{orderNumber}} has been shipped and is on its way to you.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Tracking Information</p>
        <p style="margin: 0; color: #334155;">Carrier: {{carrier}}</p>
        <p style="margin: 4px 0 0; color: #334155;">Tracking Number: {{trackingNumber}}</p>
        <p style="margin: 4px 0 0; color: #334155;">Estimated Delivery: {{estimatedDelivery}}</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{trackingUrl}}" style="background: #0f766e; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Track Your Package</a>
      </div>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: [
        'firstName',
        'orderNumber',
        'carrier',
        'trackingNumber',
        'estimatedDelivery',
        'trackingUrl',
        'year',
      ],
    },
    {
      name: 'password_reset',
      subject: 'Reset Your ShopBD Password',
      subjectBn: 'আপনার শপবিডি পাসওয়ার্ড রিসেট করুন',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">We received a request to reset your ShopBD password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{resetUrl}}" style="background: #0f766e; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #64748b;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: ['firstName', 'resetUrl', 'year'],
    },
    {
      name: 'email_verification',
      subject: 'Verify Your Email Address — ShopBD',
      subjectBn: 'আপনার ইমেল যাচাই করুন — শপবিডি',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Verify Your Email</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">Please verify your email address to complete your ShopBD registration:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{verificationUrl}}" style="background: #0f766e; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Verify Email</a>
      </div>
      <p style="font-size: 14px; color: #64748b;">This link will expire in 24 hours.</p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: ['firstName', 'verificationUrl', 'year'],
    },
    {
      name: 'order_delivered',
      subject: 'Your Order #{{orderNumber}} Has Been Delivered!',
      subjectBn: 'আপনার অর্ডার #{{orderNumber}} ডেলিভারি হয়েছে!',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0f766e; color: #fff; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Order Delivered! 🎉</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #334155;">Hi {{firstName}},</p>
      <p style="font-size: 16px; color: #334155;">Your order #{{orderNumber}} has been delivered. We hope you love your purchase!</p>
      <p style="font-size: 16px; color: #334155;">Please take a moment to leave a review — your feedback helps other shoppers and our sellers.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{reviewUrl}}" style="background: #f59e0b; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Write a Review</a>
      </div>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p>&copy; {{year}} ShopBD Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      bodyBn: null,
      variables: ['firstName', 'orderNumber', 'reviewUrl', 'year'],
    },
  ];

  for (const tmpl of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: tmpl.name },
      update: {},
      create: {
        name: tmpl.name,
        subject: tmpl.subject,
        subjectBn: tmpl.subjectBn,
        body: tmpl.body,
        bodyBn: tmpl.bodyBn,
        variables: tmpl.variables,
        isActive: true,
      },
    });
  }

  console.log(`  Seeded ${templates.length} email templates`);
}

// ---------------------------------------------------------------------------
// Seed: Theme Settings
// ---------------------------------------------------------------------------
// Theme logo + favicon source placeholders (abstract square marks).
const THEME_LOGO_SOURCE =
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=400&fit=crop&q=80';
const THEME_FAVICON_SOURCE =
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=64&h=64&fit=crop&q=80';

async function seedThemeSettings() {
  console.log('Seeding theme settings...');

  const [logoUrl, faviconUrl] = await seedImages(
    [THEME_LOGO_SOURCE, THEME_FAVICON_SOURCE],
    'theme',
  );

  const themeId = 'seed-theme-default';
  await prisma.themeSettings.upsert({
    where: { id: themeId },
    update: { logoUrl: logoUrl!, faviconUrl: faviconUrl! },
    create: {
      id: themeId,
      primaryColor: '#0f766e',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      fontFamilyBn: 'Noto Sans Bengali',
      borderRadius: '0.5rem',
      heroStyle: 'carousel',
      productCardStyle: 'standard',
      headerStyle: 'sticky-transparent',
      footerStyle: 'multi-column',
      customCss: null,
      logoUrl: logoUrl!,
      faviconUrl: faviconUrl!,
    },
  });

  console.log('  Seeded default theme settings');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
// Seed: Menus (relational)
// ──────────────────────────────────────────────────────────────────────────────

async function seedMenus() {
  console.log('Seeding menus...');

  const headerMenu = await prisma.menu.upsert({
    where: { id: 'seed-menu-header' },
    update: {},
    create: {
      id: 'seed-menu-header',
      name: 'Header Menu',
      location: 'HEADER',
    },
  });

  const footerMenu = await prisma.menu.upsert({
    where: { id: 'seed-menu-footer' },
    update: {},
    create: {
      id: 'seed-menu-footer',
      name: 'Footer Menu',
      location: 'FOOTER',
    },
  });

  // Header menu items
  const headerItems = [
    { id: 'seed-mi-home', label: 'Home', labelBn: 'হোম', url: '/', position: 0 },
    { id: 'seed-mi-shop', label: 'Shop', labelBn: 'শপ', url: '/shop', position: 1 },
    {
      id: 'seed-mi-categories',
      label: 'Categories',
      labelBn: 'ক্যাটাগরি',
      url: '/categories',
      position: 2,
    },
    { id: 'seed-mi-deals', label: 'Deals', labelBn: 'ডিলস', url: '/deals', position: 3 },
    { id: 'seed-mi-contact', label: 'Contact', labelBn: 'যোগাযোগ', url: '/contact', position: 4 },
  ];

  for (const item of headerItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, menuId: headerMenu.id },
    });
  }

  // Footer menu items
  const footerItems = [
    {
      id: 'seed-mi-about',
      label: 'About Us',
      labelBn: 'আমাদের সম্পর্কে',
      url: '/about',
      position: 0,
    },
    {
      id: 'seed-mi-privacy',
      label: 'Privacy Policy',
      labelBn: 'গোপনীয়তা নীতি',
      url: '/privacy',
      position: 1,
    },
    {
      id: 'seed-mi-terms',
      label: 'Terms of Service',
      labelBn: 'সেবার শর্তাবলী',
      url: '/terms',
      position: 2,
    },
    { id: 'seed-mi-returns', label: 'Returns', labelBn: 'রিটার্নস', url: '/returns', position: 3 },
    { id: 'seed-mi-faq', label: 'FAQ', labelBn: 'জিজ্ঞাসা', url: '/faq', position: 4 },
  ];

  for (const item of footerItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, menuId: footerMenu.id },
    });
  }

  console.log('  Seeded 2 menus with items (header, footer)');
}

// Seed: Customers & Orders
// ──────────────────────────────────────────────────────────────────────────────

async function seedOrders() {
  console.log('Seeding customers & orders...');

  // ── 1. Create customer users ──────────────────────────────────────────────
  const customerPw = await hashPassword('Customer@2025!');

  const customers = [
    {
      id: 'seed-cust-1',
      email: 'rahim@example.com',
      firstName: 'Abdur',
      lastName: 'Rahim',
      phone: '+8801711111111',
    },
    {
      id: 'seed-cust-2',
      email: 'karim@example.com',
      firstName: 'Abdul',
      lastName: 'Karim',
      phone: '+8801722222222',
    },
    {
      id: 'seed-cust-3',
      email: 'fatima@example.com',
      firstName: 'Fatima',
      lastName: 'Akter',
      phone: '+8801733333333',
    },
    {
      id: 'seed-cust-4',
      email: 'hasan@example.com',
      firstName: 'Md.',
      lastName: 'Hasan',
      phone: '+8801744444444',
    },
    {
      id: 'seed-cust-5',
      email: 'nusrat@example.com',
      firstName: 'Nusrat',
      lastName: 'Jahan',
      phone: '+8801755555555',
    },
    {
      id: 'seed-cust-6',
      email: 'tanvir@example.com',
      firstName: 'Tanvir',
      lastName: 'Ahmed',
      phone: '+8801766666666',
    },
  ];

  for (const c of customers) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        id: c.id,
        email: c.email,
        password: customerPw,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
  }

  // ── 2. Create addresses ───────────────────────────────────────────────────
  const addresses = [
    {
      id: 'seed-addr-1',
      userId: 'seed-cust-1',
      fullName: 'Abdur Rahim',
      phone: '+8801711111111',
      addressLine1: '12/A Dhanmondi R/A',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Dhanmondi',
      postalCode: '1205',
    },
    {
      id: 'seed-addr-2',
      userId: 'seed-cust-2',
      fullName: 'Abdul Karim',
      phone: '+8801722222222',
      addressLine1: '45 Gulshan Avenue',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Gulshan',
      postalCode: '1212',
    },
    {
      id: 'seed-addr-3',
      userId: 'seed-cust-3',
      fullName: 'Fatima Akter',
      phone: '+8801733333333',
      addressLine1: '78 Agrabad C/A',
      division: 'Chittagong',
      district: 'Chittagong',
      area: 'Agrabad',
      postalCode: '4100',
    },
    {
      id: 'seed-addr-4',
      userId: 'seed-cust-4',
      fullName: 'Md. Hasan',
      phone: '+8801744444444',
      addressLine1: '23 Shahbag Road',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Shahbag',
      postalCode: '1000',
    },
    {
      id: 'seed-addr-5',
      userId: 'seed-cust-5',
      fullName: 'Nusrat Jahan',
      phone: '+8801755555555',
      addressLine1: '56 Rajshahi Court',
      division: 'Rajshahi',
      district: 'Rajshahi',
      area: 'Court Area',
      postalCode: '6000',
    },
    {
      id: 'seed-addr-6',
      userId: 'seed-cust-6',
      fullName: 'Tanvir Ahmed',
      phone: '+8801766666666',
      addressLine1: '89 Uttara Sector 7',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Uttara',
      postalCode: '1230',
    },
  ];

  for (const a of addresses) {
    await prisma.address.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, label: 'Home', isDefault: true },
    });
  }

  // ── 3. Fetch products for order items ─────────────────────────────────────
  const products = await prisma.product.findMany({
    take: 15,
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      images: { select: { url: true }, take: 1 },
    },
  });

  const p = (i: number) => products[i % products.length];
  const img = (i: number) => p(i).images[0]?.url ?? null;

  // ── 4. Helper to create an order ──────────────────────────────────────────
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

  let orderNum = 1000;
  const makeOrder = async (opts: {
    id: string;
    userId: string;
    addressId: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    shippingMethodId: string;
    items: { productIdx: number; qty: number }[];
    createdDaysAgo: number;
    couponCode?: string;
    discountAmount?: number;
    notes?: string;
    cancelledAt?: Date;
    cancellationReason?: string;
    deliveredAt?: Date;
    trackingNumber?: string;
    carrier?: string;
  }) => {
    orderNum++;
    const orderDate = daysAgo(opts.createdDaysAgo);
    const itemsData = opts.items.map((it, idx) => {
      const prod = p(it.productIdx);
      const unitPrice = Number(prod.price);
      return {
        id: `${opts.id}-item-${idx}`,
        productId: prod.id,
        productName: prod.name,
        productSlug: prod.slug,
        productImage: img(it.productIdx),
        sku: prod.sku,
        quantity: it.qty,
        unitPrice,
        totalPrice: unitPrice * it.qty,
      };
    });

    const subtotal = itemsData.reduce((s, i) => s + i.totalPrice, 0);
    const shippingCost =
      opts.shippingMethodId === 'seed-ship-dhaka'
        ? 60
        : opts.shippingMethodId === 'seed-ship-express'
          ? 150
          : 120;
    const discount = opts.discountAmount ?? 0;
    const totalAmount = subtotal + shippingCost - discount;

    // Check if order already exists
    const existing = await prisma.order.findUnique({ where: { id: opts.id } });
    if (existing) return;

    await prisma.order.create({
      data: {
        id: opts.id,
        orderNumber: `ORD-20260${String(orderNum)}`,
        userId: opts.userId,
        status: opts.status as any,
        subtotal,
        shippingCost,
        taxAmount: 0,
        discountAmount: discount,
        totalAmount,
        shippingAddressId: opts.addressId,
        couponCode: opts.couponCode ?? null,
        notes: opts.notes ?? null,
        cancelledAt: opts.cancelledAt ?? null,
        cancellationReason: opts.cancellationReason ?? null,
        deliveredAt: opts.deliveredAt ?? null,
        createdAt: orderDate,
        items: {
          createMany: {
            data: itemsData.map((it) => ({
              id: it.id,
              productId: it.productId,
              productName: it.productName,
              productSlug: it.productSlug,
              productImage: it.productImage,
              sku: it.sku,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
            })),
          },
        },
        payments: {
          create: {
            id: `${opts.id}-pay`,
            method: opts.paymentMethod as any,
            status: opts.paymentStatus as any,
            amount: totalAmount,
            transactionId:
              opts.paymentMethod !== 'CASH_ON_DELIVERY'
                ? `TXN-${opts.id.slice(-6).toUpperCase()}`
                : null,
            paidAt: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(opts.paymentStatus)
              ? orderDate
              : null,
            refundedAt: ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(opts.paymentStatus)
              ? daysAgo(opts.createdDaysAgo - 1)
              : null,
            refundAmount:
              opts.paymentStatus === 'REFUNDED'
                ? totalAmount
                : opts.paymentStatus === 'PARTIALLY_REFUNDED'
                  ? Math.round(totalAmount * 0.5)
                  : null,
          },
        },
        shipping: {
          create: {
            id: `${opts.id}-ship`,
            shippingMethodId: opts.shippingMethodId,
            trackingNumber: opts.trackingNumber ?? null,
            carrier: opts.carrier ?? null,
            shippedAt: ['SHIPPED', 'DELIVERED', 'RETURNED'].includes(opts.status)
              ? daysAgo(opts.createdDaysAgo - 1)
              : null,
            deliveredAt: ['DELIVERED', 'RETURNED'].includes(opts.status)
              ? daysAgo(opts.createdDaysAgo - 3)
              : null,
          },
        },
      },
    });
  };

  // ── 5. Seed orders in various statuses ────────────────────────────────────

  // PENDING orders (recent)
  await makeOrder({
    id: 'seed-ord-pending-1',
    userId: 'seed-cust-1',
    addressId: 'seed-addr-1',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'CASH_ON_DELIVERY',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 0, qty: 1 },
      { productIdx: 5, qty: 2 },
    ],
    createdDaysAgo: 0,
    notes: 'Please deliver after 5 PM',
  });

  await makeOrder({
    id: 'seed-ord-pending-2',
    userId: 'seed-cust-3',
    addressId: 'seed-addr-3',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-outside',
    items: [{ productIdx: 3, qty: 1 }],
    createdDaysAgo: 0,
  });

  await makeOrder({
    id: 'seed-ord-pending-3',
    userId: 'seed-cust-5',
    addressId: 'seed-addr-5',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-outside',
    items: [
      { productIdx: 6, qty: 1 },
      { productIdx: 8, qty: 1 },
      { productIdx: 11, qty: 2 },
    ],
    createdDaysAgo: 1,
  });

  // CONFIRMED orders
  await makeOrder({
    id: 'seed-ord-confirmed-1',
    userId: 'seed-cust-2',
    addressId: 'seed-addr-2',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 1, qty: 1 },
      { productIdx: 10, qty: 1 },
    ],
    createdDaysAgo: 2,
  });

  await makeOrder({
    id: 'seed-ord-confirmed-2',
    userId: 'seed-cust-4',
    addressId: 'seed-addr-4',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-express',
    items: [{ productIdx: 14, qty: 1 }],
    createdDaysAgo: 1,
  });

  // PROCESSING orders
  await makeOrder({
    id: 'seed-ord-processing-1',
    userId: 'seed-cust-6',
    addressId: 'seed-addr-6',
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    paymentMethod: 'CREDIT_CARD',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 4, qty: 1 },
      { productIdx: 5, qty: 1 },
    ],
    createdDaysAgo: 3,
  });

  await makeOrder({
    id: 'seed-ord-processing-2',
    userId: 'seed-cust-1',
    addressId: 'seed-addr-1',
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 7, qty: 2 },
      { productIdx: 9, qty: 1 },
    ],
    createdDaysAgo: 4,
  });

  // SHIPPED orders
  await makeOrder({
    id: 'seed-ord-shipped-1',
    userId: 'seed-cust-2',
    addressId: 'seed-addr-2',
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 12, qty: 3 },
      { productIdx: 13, qty: 5 },
    ],
    createdDaysAgo: 5,
    trackingNumber: 'PTH-20260212-7845',
    carrier: 'Pathao Courier',
  });

  await makeOrder({
    id: 'seed-ord-shipped-2',
    userId: 'seed-cust-3',
    addressId: 'seed-addr-3',
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-outside',
    items: [{ productIdx: 2, qty: 1 }],
    createdDaysAgo: 6,
    trackingNumber: 'SFC-20260211-3291',
    carrier: 'Steadfast Courier',
  });

  await makeOrder({
    id: 'seed-ord-shipped-3',
    userId: 'seed-cust-5',
    addressId: 'seed-addr-5',
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    paymentMethod: 'CASH_ON_DELIVERY',
    shippingMethodId: 'seed-ship-outside',
    items: [
      { productIdx: 6, qty: 1 },
      { productIdx: 10, qty: 2 },
    ],
    createdDaysAgo: 4,
    trackingNumber: 'RDX-20260213-5567',
    carrier: 'RedX',
  });

  // DELIVERED orders
  await makeOrder({
    id: 'seed-ord-delivered-1',
    userId: 'seed-cust-1',
    addressId: 'seed-addr-1',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [{ productIdx: 0, qty: 1 }],
    createdDaysAgo: 14,
    trackingNumber: 'PTH-20260203-1234',
    carrier: 'Pathao Courier',
    deliveredAt: daysAgo(10),
  });

  await makeOrder({
    id: 'seed-ord-delivered-2',
    userId: 'seed-cust-4',
    addressId: 'seed-addr-4',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'CREDIT_CARD',
    shippingMethodId: 'seed-ship-express',
    items: [
      { productIdx: 3, qty: 1 },
      { productIdx: 5, qty: 1 },
    ],
    createdDaysAgo: 21,
    trackingNumber: 'PTH-20260127-8899',
    carrier: 'Pathao Courier',
    deliveredAt: daysAgo(17),
  });

  await makeOrder({
    id: 'seed-ord-delivered-3',
    userId: 'seed-cust-6',
    addressId: 'seed-addr-6',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 8, qty: 1 },
      { productIdx: 9, qty: 1 },
      { productIdx: 11, qty: 3 },
    ],
    createdDaysAgo: 30,
    trackingNumber: 'SFC-20260118-4455',
    carrier: 'Steadfast Courier',
    deliveredAt: daysAgo(26),
  });

  await makeOrder({
    id: 'seed-ord-delivered-4',
    userId: 'seed-cust-2',
    addressId: 'seed-addr-2',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [{ productIdx: 7, qty: 1 }],
    createdDaysAgo: 45,
    trackingNumber: 'PTH-20260103-6677',
    carrier: 'Pathao Courier',
    deliveredAt: daysAgo(41),
    couponCode: 'EID25',
    discountAmount: 1150,
  });

  // CANCELLED orders
  await makeOrder({
    id: 'seed-ord-cancelled-1',
    userId: 'seed-cust-3',
    addressId: 'seed-addr-3',
    status: 'CANCELLED',
    paymentStatus: 'CANCELLED',
    paymentMethod: 'CASH_ON_DELIVERY',
    shippingMethodId: 'seed-ship-outside',
    items: [{ productIdx: 14, qty: 1 }],
    createdDaysAgo: 10,
    cancelledAt: daysAgo(9),
    cancellationReason: 'Changed my mind, found a better price elsewhere.',
  });

  await makeOrder({
    id: 'seed-ord-cancelled-2',
    userId: 'seed-cust-4',
    addressId: 'seed-addr-4',
    status: 'CANCELLED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 1, qty: 1 },
      { productIdx: 12, qty: 2 },
    ],
    createdDaysAgo: 8,
    cancelledAt: daysAgo(7),
    cancellationReason: 'Ordered by mistake.',
  });

  await makeOrder({
    id: 'seed-ord-cancelled-3',
    userId: 'seed-cust-6',
    addressId: 'seed-addr-6',
    status: 'CANCELLED',
    paymentStatus: 'CANCELLED',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-dhaka',
    items: [{ productIdx: 10, qty: 3 }],
    createdDaysAgo: 15,
    cancelledAt: daysAgo(14),
    cancellationReason: 'Delivery time was too long.',
  });

  // RETURNED orders
  await makeOrder({
    id: 'seed-ord-returned-1',
    userId: 'seed-cust-1',
    addressId: 'seed-addr-1',
    status: 'RETURNED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-dhaka',
    items: [{ productIdx: 7, qty: 1 }],
    createdDaysAgo: 20,
    trackingNumber: 'PTH-20260128-1122',
    carrier: 'Pathao Courier',
    deliveredAt: daysAgo(16),
    notes: 'Product was defective — screen had dead pixels.',
  });

  await makeOrder({
    id: 'seed-ord-returned-2',
    userId: 'seed-cust-5',
    addressId: 'seed-addr-5',
    status: 'RETURNED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'CREDIT_CARD',
    shippingMethodId: 'seed-ship-outside',
    items: [{ productIdx: 6, qty: 2 }],
    createdDaysAgo: 25,
    trackingNumber: 'SFC-20260123-9988',
    carrier: 'Steadfast Courier',
    deliveredAt: daysAgo(21),
    notes: 'Size did not match description, returning both items.',
  });

  await makeOrder({
    id: 'seed-ord-returned-3',
    userId: 'seed-cust-2',
    addressId: 'seed-addr-2',
    status: 'RETURNED',
    paymentStatus: 'PARTIALLY_REFUNDED',
    paymentMethod: 'NAGAD',
    shippingMethodId: 'seed-ship-dhaka',
    items: [
      { productIdx: 0, qty: 1 },
      { productIdx: 5, qty: 1 },
    ],
    createdDaysAgo: 35,
    trackingNumber: 'RDX-20260113-4477',
    carrier: 'RedX',
    deliveredAt: daysAgo(30),
    notes: 'Returning headphones only — phone is fine. Partial refund processed.',
  });

  await makeOrder({
    id: 'seed-ord-returned-4',
    userId: 'seed-cust-4',
    addressId: 'seed-addr-4',
    status: 'RETURNED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'BKASH',
    shippingMethodId: 'seed-ship-express',
    items: [
      { productIdx: 9, qty: 1 },
      { productIdx: 10, qty: 1 },
      { productIdx: 11, qty: 1 },
    ],
    createdDaysAgo: 18,
    trackingNumber: 'PTH-20260130-5566',
    carrier: 'Pathao Courier',
    deliveredAt: daysAgo(14),
    notes: 'Items arrived damaged during shipping.',
  });

  // REFUNDED order (separate from returned)
  await makeOrder({
    id: 'seed-ord-refunded-1',
    userId: 'seed-cust-3',
    addressId: 'seed-addr-3',
    status: 'CANCELLED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'CREDIT_CARD',
    shippingMethodId: 'seed-ship-outside',
    items: [{ productIdx: 4, qty: 1 }],
    createdDaysAgo: 12,
    cancelledAt: daysAgo(11),
    cancellationReason:
      'Payment was charged but order was not confirmed in time. Full refund issued.',
  });

  console.log('  Seeded 6 customers, 6 addresses, 22 orders across all statuses');
}

// ---------------------------------------------------------------------------
// Seed: Reviews
// ---------------------------------------------------------------------------

async function seedReviews() {
  console.log('Seeding reviews...');

  // Grab products and customers to link reviews
  const products = await prisma.product.findMany({ take: 12, select: { id: true, name: true } });
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    take: 6,
    select: { id: true },
  });

  if (products.length === 0 || customers.length === 0) {
    console.log('  Skipping reviews — no products or customers found');
    return;
  }

  const reviewData: {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    title: string | null;
    comment: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminReply: string | null;
    repliedAt: Date | null;
    isVerified: boolean;
  }[] = [
    {
      id: 'seed-rev-01',
      productId: products[0].id,
      userId: customers[0].id,
      rating: 5,
      title: 'Excellent product!',
      comment: 'Works perfectly and arrived on time. Very happy with the purchase.',
      status: 'APPROVED',
      adminReply: 'Thank you for your kind review!',
      repliedAt: new Date(),
      isVerified: true,
    },
    {
      id: 'seed-rev-02',
      productId: products[1].id,
      userId: customers[0].id,
      rating: 4,
      title: 'Good quality',
      comment: 'Nice product overall. Packaging could be better though.',
      status: 'APPROVED',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
    {
      id: 'seed-rev-03',
      productId: products[2].id,
      userId: customers[1].id,
      rating: 3,
      title: 'Average experience',
      comment:
        'Product is okay but not as described. The color was slightly different from the photos.',
      status: 'APPROVED',
      adminReply: 'We apologize for the discrepancy. Please contact support for a resolution.',
      repliedAt: new Date(),
      isVerified: false,
    },
    {
      id: 'seed-rev-04',
      productId: products[3].id,
      userId: customers[1].id,
      rating: 5,
      title: 'Amazing value for money',
      comment: 'Best purchase I have made this year. Highly recommend to everyone!',
      status: 'APPROVED',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
    {
      id: 'seed-rev-05',
      productId: products[4].id,
      userId: customers[2].id,
      rating: 1,
      title: 'Very disappointed',
      comment: 'Product broke after 2 days of use. Terrible quality.',
      status: 'APPROVED',
      adminReply: 'We are sorry to hear that. A replacement has been initiated.',
      repliedAt: new Date(),
      isVerified: true,
    },
    {
      id: 'seed-rev-06',
      productId: products[5].id,
      userId: customers[2].id,
      rating: 4,
      title: null,
      comment: 'Good product, fast shipping.',
      status: 'PENDING',
      adminReply: null,
      repliedAt: null,
      isVerified: false,
    },
    {
      id: 'seed-rev-07',
      productId: products[6].id,
      userId: customers[3].id,
      rating: 5,
      title: 'Superb!',
      comment: 'Exceeded my expectations. The build quality is outstanding.',
      status: 'PENDING',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
    {
      id: 'seed-rev-08',
      productId: products[7].id,
      userId: customers[3].id,
      rating: 2,
      title: 'Not worth the price',
      comment: 'Too expensive for what you get. There are better alternatives available.',
      status: 'PENDING',
      adminReply: null,
      repliedAt: null,
      isVerified: false,
    },
    {
      id: 'seed-rev-09',
      productId: products[0].id,
      userId: customers[4].id,
      rating: 4,
      title: 'Great product',
      comment: 'Using it daily. Battery life could be better but overall a solid buy.',
      status: 'APPROVED',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
    {
      id: 'seed-rev-10',
      productId: products[8 % products.length].id,
      userId: customers[4].id,
      rating: 1,
      title: 'SPAM - Fake listing!',
      comment: 'This is clearly a fake product. DO NOT BUY!!! Scam seller!!!',
      status: 'REJECTED',
      adminReply: 'This review has been rejected for violating our community guidelines.',
      repliedAt: new Date(),
      isVerified: false,
    },
    {
      id: 'seed-rev-11',
      productId: products[9 % products.length].id,
      userId: customers[5 % customers.length].id,
      rating: 5,
      title: 'Love it',
      comment: 'Perfect gift for my wife. She absolutely loved it.',
      status: 'PENDING',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
    {
      id: 'seed-rev-12',
      productId: products[10 % products.length].id,
      userId: customers[5 % customers.length].id,
      rating: 3,
      title: null,
      comment: 'Delivery was delayed by 3 days. Product itself is fine.',
      status: 'APPROVED',
      adminReply: null,
      repliedAt: null,
      isVerified: false,
    },
    {
      id: 'seed-rev-13',
      productId: products[3].id,
      userId: customers[4].id,
      rating: 2,
      title: 'Contains profanity and abuse',
      comment: 'This review contains inappropriate content that violates guidelines.',
      status: 'REJECTED',
      adminReply: 'Review removed for violating community standards.',
      repliedAt: new Date(),
      isVerified: false,
    },
    {
      id: 'seed-rev-14',
      productId: products[5].id,
      userId: customers[0].id,
      rating: 5,
      title: 'Second time buying',
      comment: 'Bought this again for my brother. Consistent quality!',
      status: 'APPROVED',
      adminReply: 'Glad you came back! Thank you for your loyalty.',
      repliedAt: new Date(),
      isVerified: true,
    },
    {
      id: 'seed-rev-15',
      productId: products[1].id,
      userId: customers[3].id,
      rating: 4,
      title: 'Pretty good',
      comment: 'Works as advertised. Would buy again.',
      status: 'PENDING',
      adminReply: null,
      repliedAt: null,
      isVerified: true,
    },
  ];

  let created = 0;
  for (const r of reviewData) {
    try {
      await prisma.review.upsert({
        where: { id: r.id },
        update: {},
        create: r,
      });
      created++;
    } catch (err: any) {
      // Skip duplicate (productId, userId) constraint violations
      if (err?.code === 'P2002') continue;
      throw err;
    }
  }

  console.log(
    `  Seeded ${created} reviews (${reviewData.filter((r) => r.status === 'PENDING').length} pending, ${reviewData.filter((r) => r.status === 'APPROVED').length} approved, ${reviewData.filter((r) => r.status === 'REJECTED').length} rejected)`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Starting database seed...\n');

  await seedAdminUser();
  await seedCategories();
  const brandMap = await seedBrands();
  await seedProducts(brandMap);
  await seedPages();
  await seedBanners();
  await seedNavigationMenus();
  await seedMenus();
  await seedShippingMethods();
  await seedSettings();
  await seedEmailTemplates();
  await seedThemeSettings();
  await seedOrders();
  await seedReviews();

  console.log('\nSeed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
