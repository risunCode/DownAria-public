export function slugify(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\w\s.-]+/g, ' ')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'download';
}

export function inferExtension(mimeType?: string, container?: string, url?: string): string | undefined {
  const lowerContainer = container?.trim().toLowerCase();
  if (lowerContainer) {
    return lowerContainer;
  }

  const lowerMime = mimeType?.trim().toLowerCase();
  if (lowerMime?.includes('/')) {
    const [, subtype] = lowerMime.split('/');
    return subtype?.split(';')[0]?.trim();
  }

  if (url) {
    try {
      const parsed = new URL(url);
      const file = parsed.pathname.split('/').pop();
      if (file?.includes('.')) {
        return file.split('.').pop()?.toLowerCase();
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function buildFilename(baseTitle: string, extension?: string, fallback = 'download'): string {
  const slug = slugify(baseTitle || fallback);
  if (!extension) {
    return slug;
  }

  const normalizedExtension = extension.replace(/^\./, '').toLowerCase();
  if (slug.toLowerCase().endsWith(`.${normalizedExtension}`)) {
    return slug;
  }

  return `${slug}.${normalizedExtension}`;
}
