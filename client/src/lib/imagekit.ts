interface ImageKitTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  aspectRatio?: string;
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
}

const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/fjmnb748e';

export function buildImageKitUrl(imageUrl: string, options: ImageKitTransformOptions = {}): string {
  // If not an ImageKit URL, return as-is
  if (!imageUrl || !imageUrl.includes('imagekit')) {
    return imageUrl;
  }

  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    aspectRatio,
    crop = 'maintain_ratio',
  } = options;

  const transformations: string[] = [];

  if (width) {
    transformations.push(`w-${width}`);
  }

  if (height) {
    transformations.push(`h-${height}`);
  }

  if (aspectRatio) {
    transformations.push(`ar-${aspectRatio}`);
  }

  if (crop) {
    transformations.push(`c-${crop}`);
  }

  transformations.push(`q-${quality}`);
  transformations.push(`f-${format}`);

  if (transformations.length === 0) {
    return imageUrl;
  }

  const transformationPath = transformations.join(',');
  
  // Build ImageKit transformation URL
  if (imageUrl.includes('/upload/')) {
    return imageUrl.replace('/upload/', `/upload/${transformationPath}/`);
  }

  return imageUrl;
}

export function getThumbnailUrl(imageUrl: string): string {
  return buildImageKitUrl(imageUrl, {
    width: 120,
    height: 120,
    quality: 60,
    format: 'auto',
    crop: 'force',
  });
}

export function getGalleryThumbUrl(imageUrl: string): string {
  return buildImageKitUrl(imageUrl, {
    width: 240,
    height: 200,
    quality: 70,
    format: 'auto',
    crop: 'force',
  });
}

export function getMainImageUrl(imageUrl: string): string {
  return buildImageKitUrl(imageUrl, {
    width: 800,
    height: 600,
    quality: 85,
    format: 'auto',
    crop: 'maintain_ratio',
  });
}

export function getFullscreenImageUrl(imageUrl: string): string {
  return buildImageKitUrl(imageUrl, {
    width: 1920,
    height: 1440,
    quality: 90,
    format: 'auto',
    crop: 'maintain_ratio',
  });
}
