import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.isPublic(context);

    if (isPublic) {
      // Best-effort: run the JWT strategy so req.user gets populated when a
      // valid token is presented (e.g. an admin browsing a storefront route
      // that's otherwise open to guests). Swallow any failure — public
      // really means public; we just want optional identity.
      try {
        await super.canActivate(context);
      } catch {
        /* no token / bad token — fine, route is still public */
      }
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }

  override handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (this.isPublic(context)) {
      // Never throw on public routes — return whatever we got (possibly null).
      return user;
    }
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private isPublic(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
