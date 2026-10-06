import type { Account, Platform } from "../db";
import { configured, type Connector, type Publisher } from "./common";
import { linkedin, linkedinConnector } from "./linkedin";
import { facebook, instagram, metaConnector } from "./meta";
import { tiktok, tiktokConnector } from "./tiktok";
import { isRelayed, uploadPostPublisher, xDirect } from "./uploadpost";
import { youtube, youtubeConnector } from "./youtube";

export { PLATFORM_LABEL } from "./labels";

const linkedinEnabled = () => process.env.FEATURE_LINKEDIN === "true";

export function connectors(): Connector[] {
  return [metaConnector, youtubeConnector, tiktokConnector, ...(linkedinEnabled() ? [linkedinConnector] : [])];
}

export const publishers: Record<Platform, Publisher> = { youtube, facebook, instagram, tiktok, linkedin, x: xDirect };

/** Quién publica en esta cuenta: Upload-Post si se conectó a través de su página, si no el adaptador directo de la red. */
export function publisherFor(account: Pick<Account, "platform" | "external_id">): Publisher {
  return isRelayed(account) ? uploadPostPublisher : publishers[account.platform];
}

export function getConnector(id: string) {
  return connectors().find((c) => c.id === id);
}

export function connectorStatus() {
  return connectors().map((c) => ({
    id: c.id,
    label: c.label,
    platforms: c.platforms,
    configured: configured(c.envVars),
  }));
}
