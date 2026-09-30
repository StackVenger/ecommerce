# Watch theme — design inventory

The storefront and admin UI follow a visual language modelled on the Timekeeper
Shopify demo (a watch store). Only the **visual system** was taken from the
reference: layout patterns, type, colour, spacing and component styling. All
content, data, routes and behaviour are the application's own. Features the
reference has but this app doesn't (blog, currency switcher, compare, countdown
timers, vendor filters) were **not** added.

## Reference pages analysed

Home, Home-1 and Home-2 (three header/hero variants). Simple, variable,
sold-out, affiliate, countdown and dropshipping product pages. Shop grid, shop
list, the "hot" collection, cart (empty state), blog list and blog article,
login, register, About Us, Contact Us, FAQ, search results and 404. Each was
checked at 1440px and 390px.

## Tokens

| Token            | Value                              | Notes                                                                          |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| Accent / primary | `#f9706a` (coral)                  | Buttons, prices, active states, the underline under section titles, sale tags  |
| Ink              | `#333333`                          | Body and heading text (`gray-900`)                                             |
| Muted text       | `#868686`, `#999`                  | Meta lines, struck-through prices, placeholders                                |
| Surface          | `#ffffff`                          | Page canvas and cards                                                          |
| Image well       | `#f7f7f7`                          | Product image backgrounds, sidebar panels (`gray-50`)                          |
| Hairline         | `#e8e8e8`                          | Card borders, dividers, the breadcrumb rule (`gray-200`)                       |
| Radius           | `0`                                | Everything is square. Circles are used only for social icons and carousel dots |
| Shadow           | none / hairline                    | Cards use a 1px border; a soft lift appears on hover only                      |
| Heading font     | Montserrat 600                     | Section titles 24px, nav 14px, product titles in cards 15px/400                |
| Body font        | IBM Plex Sans 400                  | 15px base; 13–14px for meta text; 300 for struck-through prices                |
| Price            | Plex 16px/700 in coral             | Compare-at price 13px/300 grey with a line through it                          |
| Button           | Plex 16px/700, 50px tall, 0 radius | Solid coral, coral outline, or black for auth "Sign in"                        |
| Container        | ~1170px                            | Content is centred; section spacing ~60–80px                                   |

All of these live in `packages/ui/tailwind.palette.ts` (palette),
`packages/ui/tailwind.config.ts` (radius, shadows, weights, tracking) and
`apps/web/src/app/globals.css` (HSL tokens + component classes). The admin theme
editor can still override colours, fonts and radius at runtime. The
**Timekeeper** preset in _Admin → Appearance → Theme_ applies these values.

## Pattern → component map

| Reference pattern    | What it looks like                                                                                                                                                                                                     | Implemented in                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Utility bar          | Coral strip with "Follow us" social links on the left and account links on the right                                                                                                                                   | `components/layout/header.tsx` (`TopBar`)             |
| Header               | Coral bar with the logo, a wide translucent search field and a boxed cart button with a count                                                                                                                          | `header.tsx`, `cart/cart-icon.tsx`                    |
| Navigation           | White row below the header; Montserrat 14/600 links that turn coral on hover or when active                                                                                                                            | `header.tsx`                                          |
| Mobile navigation    | Logo and cart row, then a white "Menu" bar with a hamburger that opens a stacked panel                                                                                                                                 | `header.tsx`                                          |
| Breadcrumb           | White strip with a bottom rule: "Home › **Current**" (current page in coral)                                                                                                                                           | `components/ui/bento.tsx` → `Breadcrumbs`             |
| Hero slider          | Full-bleed grey panel: small kicker, 50px/600 title, copy, coral CTA, image on the right, dot pager                                                                                                                    | `app/(shop)/page.tsx`                                 |
| Feature strip        | Three or four coral line icons with a coral title and a grey caption, between hairlines                                                                                                                                | `(shop)/page.tsx` (`TRUST_ITEMS`)                     |
| Section heading      | Montserrat 24/600 with a 48×2px coral rule underneath; square prev/next buttons on the right                                                                                                                           | `.shop-heading` + `SectionHeading`                    |
| Product card         | #f7f7f7 image well, square coral "-35%" tag, white info strip with a hairline border, title 15/400, coral price, cart icon on the right                                                                                | `components/products/product-card.tsx`                |
| Product list row     | Image on the left; title, price and description on the right                                                                                                                                                           | `ProductCard layout="list"`                           |
| Promo banner         | Image with dark or light copy and an underlined "BUY NOW" link                                                                                                                                                         | `(shop)/page.tsx` promo banners, `footer-banners.tsx` |
| Shop sidebar         | #f7f7f7 panel with widget titles (Montserrat 16/600), search, category links with counts, checkbox filters                                                                                                             | `(shop)/products/page.tsx` filters                    |
| Shop toolbar         | Bordered bar with grid/list toggles, "Showing x–y of z", and grey select boxes for Show and Sort                                                                                                                       | `(shop)/products/page.tsx`                            |
| Pagination           | "Prev 1 2 3 Next"; the active page is a coral square                                                                                                                                                                   | `(shop)` listing pages, `admin/list-pagination.tsx`   |
| Product detail       | Grey gallery on the left with thumbnails. On the right, a bordered panel: 24px title, 28px coral price, meta lines, divider, description, qty stepper with coral Add to cart, full-width Buy now, service icons, share | `(shop)/products/[slug]/page.tsx`                     |
| Product tabs         | Centred tab titles at 20/600; inactive tabs grey, the active one #333 with a coral underline                                                                                                                           | `products/[slug]` tabs                                |
| Sold out             | The buy button turns into a disabled "Sold out" button; "Availability" text shows the state                                                                                                                            | product card + detail page                            |
| Cart                 | Page title, a bordered table of lines, a totals panel and coral checkout button; the empty state is a big title and a link                                                                                             | `(shop)/cart/page.tsx`, `cart/cart-drawer.tsx`        |
| Auth forms           | Centred #f2f2f2 panel holding a white card; hairline inputs; black submit button                                                                                                                                       | `app/(auth)/*`                                        |
| Contact / info pages | A form column beside a #f2f2f2 info panel; coral headings                                                                                                                                                              | `(shop)/[slug]/page.tsx` (CMS pages)                  |
| FAQ accordion        | Grey bars; the open item turns coral with white text                                                                                                                                                                   | not in app — skipped                                  |
| Blog cards / article | —                                                                                                                                                                                                                      | not in app — skipped                                  |
| Footer               | White, with a hairline top. Brand column (logo, address, help line, round social icons), link columns (Montserrat 16/600 titles, 13px grey links), bottom row with © and payment badges                                | `components/layout/footer.tsx`                        |
| Admin                | Same tokens: square hairline cards, grey table header row, coral primary actions                                                                                                                                       | `globals.css` component layer + `packages/ui`         |
