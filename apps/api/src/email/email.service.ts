import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  locale?: 'en' | 'bn';
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates = new Map<string, handlebars.TemplateDelegate>();
  private layoutTemplate: handlebars.TemplateDelegate;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    this.registerHelpers();
    this.loadLayout();
  }

  // Verify SMTP credentials at boot so a misconfigured App Password is loud
  // in the console instead of silently failing on the first send attempt.
  // Never throw — the API should still come up if SMTP is broken in dev.
  async onModuleInit(): Promise<void> {
    await this.verifyConnection();
  }

  private registerHelpers(): void {
    handlebars.registerHelper('formatPrice', (amount: number) => {
      return `৳${amount.toLocaleString('en-BD')}`;
    });

    handlebars.registerHelper('formatDate', (date: string | Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
  }

  private loadLayout(): void {
    const layoutPath = path.join(__dirname, 'templates', 'layouts', 'base.hbs');
    if (fs.existsSync(layoutPath)) {
      const source = fs.readFileSync(layoutPath, 'utf-8');
      this.layoutTemplate = handlebars.compile(source);
    }
  }

  private getTemplate(name: string): handlebars.TemplateDelegate {
    if (this.templates.has(name)) {
      return this.templates.get(name)!;
    }
    const tplPath = path.join(__dirname, 'templates', `${name}.hbs`);
    const source = fs.readFileSync(tplPath, 'utf-8');
    const tpl = handlebars.compile(source);
    this.templates.set(name, tpl);
    return tpl;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, template, context, locale = 'en', attachments } = options;
    try {
      const tplFn = this.getTemplate(template);
      const body = tplFn({ ...context, locale });
      const html = this.layoutTemplate
        ? this.layoutTemplate({ body, subject, locale, ...context })
        : body;

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', '"BDShop" <noreply@bdshop.com.bd>'),
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed', error.message);
      return false;
    }
  }
}
