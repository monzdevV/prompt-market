import { fileBlob, fileSize, form, http, HttpError, redirectUri, UnknownOutcomeError, type Connector, type Publisher } from "./common";

const VERSION = process.env.LINKEDIN_VERSION ?? "202507";

function headers(token: string, json = true) {
  return {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

/** LinkedIn usa el formato "little text": hay que escapar caracteres reservados y marcar los hashtags. */
function littleText(text: string) {
  const escape = (s: string) => s.replace(/[\\|{}@\[\]()<>#*_~]/g, "\\$&");
  return text
    .split(/(#[\p{L}\p{N}_]+)/u)
    .map((part) => (/^#[\p{L}\p{N}_]+$/u.test(part) ? `{hashtag|\\#|${part.slice(1)}}` : escape(part)))
    .join("");
}

export const linkedinConnector: Connector = {
  id: "linkedin",
  label: "LinkedIn",
  platforms: ["linkedin"],
  envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  authUrl(state) {
    const q = form({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri("linkedin"),
      scope: "openid profile w_member_social",
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
  },
  async callback(code) {
    const tok = await http("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      body: form({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri("linkedin"),
      }),
    });
    const me = await http("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    return {
      accounts: [
      {
        platform: "linkedin" as const,
        external_id: me.sub,
        name: me.name,
        avatar: me.picture ?? null,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        expires_at: Date.now() + tok.expires_in * 1000,
      },
      ],
    };
  },
};

/** LinkedIn está detrás de FEATURE_LINKEDIN: no hay renovación de token (caduca a los ~60 días). */
export const linkedin: Publisher = {
  async publish({ account, post, media, filePath, caption, ref, saveRef }) {
    if (ref.committed) {
      throw new UnknownOutcomeError("La publicación en LinkedIn se interrumpió: comprueba en tu perfil si salió");
    }
    const tok = account.access_token;
    const owner = `urn:li:person:${account.external_id}`;
    const size = fileSize(filePath);
    const blob = await fileBlob(filePath);

    const init = await http("https://api.linkedin.com/rest/videos?action=initializeUpload", {
      method: "POST",
      headers: headers(tok),
      body: JSON.stringify({
        initializeUploadRequest: { owner, fileSizeBytes: size, uploadCaptions: false, uploadThumbnail: false },
      }),
    });
    const { video, uploadInstructions, uploadToken } = init.value;

    const etags: string[] = [];
    for (const part of uploadInstructions) {
      const res = await fetch(part.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: blob.slice(part.firstByte, part.lastByte + 1),
      });
      if (!res.ok) throw new HttpError(res.status, `LinkedIn subida ${res.status}: ${(await res.text()).slice(0, 300)}`);
      etags.push(res.headers.get("etag") ?? "");
    }

    await http("https://api.linkedin.com/rest/videos?action=finalizeUpload", {
      method: "POST",
      headers: headers(tok),
      body: JSON.stringify({ finalizeUploadRequest: { video, uploadToken: uploadToken ?? "", uploadedPartIds: etags } }),
    });

    saveRef({ committed: true, video });
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: headers(tok),
      body: JSON.stringify({
        author: owner,
        commentary: littleText(caption),
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        content: { media: { title: post.title || media.original_name, id: video } },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) throw new HttpError(res.status, `LinkedIn ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const urn = res.headers.get("x-restli-id") ?? video;
    return { status: "done", remoteId: urn, url: `https://www.linkedin.com/feed/update/${urn}` };
  },
};
