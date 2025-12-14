// ImageKit CDN URL transformation utilities for optimized image delivery

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  blur?: number;
}

export interface OptimizedImageURLs {
  original: string;
  thumbnail: string;
  gallery: string;
}

/**
 * Generates an ImageKit URL with transformations
 * Base format: https://ik.imagekit.io/{urlEndpoint}/{path}?tr=transformation
 */
export function generateImageKitURL(
  imageKitFileId: string,
  urlEndpoint: string,
  options?: ImageTransformOptions
): string {
  const baseURL = `${urlEndpoint}/${imageKitFileId}`;
  
  if (!options || Object.keys(options).length === 0) {
    return baseURL;
  }

  const transformations: string[] = [];

  if (options.width) transformations.push(`w-${options.width}`);
  if (options.height) transformations.push(`h-${options.height}`);
  if (options.quality) transformations.push(`q-${options.quality}`);
  if (options.format) transformations.push(`f-${options.format}`);
  if (options.blur) transformations.push(`bl-${options.blur}`);

  const tr = transformations.join(',');
  return `${baseURL}?tr=${tr}`;
}

/**
 * Generates a set of optimized image URLs for different use cases
 */
export function generateOptimizedImageURLs(
  imageKitFileId: string,
  urlEndpoint: string
): OptimizedImageURLs {
  return {
    // Original image with high quality for detail viewing
    original: generateImageKitURL(imageKitFileId, urlEndpoint, {
      quality: 90,
      format: 'auto',
    }),
    // Small thumbnail for listings (300x200, optimized quality)
    thumbnail: generateImageKitURL(imageKitFileId, urlEndpoint, {
      width: 300,
      height: 200,
      quality: 75,
      format: 'auto',
    }),
    // Medium gallery image (800x600, good quality)
    gallery: generateImageKitURL(imageKitFileId, urlEndpoint, {
      width: 800,
      height: 600,
      quality: 85,
      format: 'auto',
    }),
  };
}

/**
 * Get ImageKit URL endpoint from environment
 */
export function getImageKitURLEndpoint(): string {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) {
    throw new Error('IMAGEKIT_URL_ENDPOINT is not configured');
  }
  // Ensure endpoint doesn't have trailing slash
  return endpoint.replace(/\/$/, '');
}

/**
 * Generate a signed URL for private image access
 * Uses HMAC-SHA256 signature to ensure only authorized users can access
 */
export function generateSignedImageURL(
  imageKitFileId: string,
  urlEndpoint: string,
  privateKey: string,
  expiresIn: number = 3600 // 1 hour default
): string {
  const crypto = require('crypto');
  
  const baseURL = `${urlEndpoint}/${imageKitFileId}`;
  const transformations = 'q-90,f-auto';
  const timestamp = Math.floor(Date.now() / 1000);
  const expiration = timestamp + expiresIn;
  
  // Create signature: HMAC(privateKey, path + expiration)
  const pathWithTr = `/${imageKitFileId}?tr=${transformations}`;
  const signatureString = `${pathWithTr}${expiration}`;
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(signatureString)
    .digest('hex');
  
  return `${baseURL}?tr=${transformations}&ik-t=${expiration}&ik-s=${signature}`;
}

/**
 * Validate if a user should have access to a private image
 * Returns true if user is the uploader, property owner, agent, admin, or property manager
 */
export interface ImageAccessCheckParams {
  userId: string;
  userRole: string;
  uploaderId: string;
  propertyId?: string;
  propertyOwnerId?: string;
  listingAgentId?: string;
}

export function canAccessPrivateImage(params: ImageAccessCheckParams): boolean {
  // Always allow if admin
  if (params.userRole === 'admin') return true;
  
  // Allow uploader
  if (params.userId === params.uploaderId) return true;
  
  // Allow property owner or agent
  if (params.propertyId) {
    if (params.userId === params.propertyOwnerId) return true;
    if (params.userId === params.listingAgentId) return true;
  }
  
  // Allow property managers
  if (params.userRole === 'property_manager') return true;
  
  return false;
}
