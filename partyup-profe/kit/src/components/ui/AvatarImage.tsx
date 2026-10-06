/**
 * AvatarImage
 * ===========
 * expo-image wrapper for user avatars. Signed avatar URLs expire after
 * 7 days; when the URL is expired it is re-signed on the fly before loading.
 */

import { Image, ImageProps } from 'expo-image';
import React, { useEffect, useState } from 'react';

import { isAvatarUrlFresh, resolveAvatarUrl } from '@/src/services/avatarUrlService';

interface AvatarImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export function AvatarImage({ uri, ...rest }: AvatarImageProps) {
  const [resolved, setResolved] = useState<string | undefined>(() =>
    isAvatarUrlFresh(uri) ? uri : undefined,
  );

  useEffect(() => {
    if (isAvatarUrlFresh(uri)) {
      setResolved(uri);
      return;
    }
    let cancelled = false;
    setResolved(undefined);
    resolveAvatarUrl(uri).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => { cancelled = true; };
  }, [uri]);

  return <Image {...rest} source={resolved ? { uri: resolved } : undefined} />;
}
