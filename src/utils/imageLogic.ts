/**
 * Image logic utilities for handling featured images and gallery images
 */

export interface PostImage {
  url: string;
  alt_text?: string | null;
  order_index: number;
}

export interface ImageDisplayResult {
  featuredImage: string | null;
  galleryImages: PostImage[];
  hasBoth: boolean;
  hasOnlyOne: boolean;
  hasGallery: boolean;
}

/**
 * Determines how to display featured and gallery images based on what's available
 * 
 * Rules:
 * - If only one image (either featured or gallery): display same image in both featured and gallery
 * - If both featured and gallery: display featured in featured section, gallery in gallery section
 * - If neither: return null for both
 */
export function getImageDisplayLogic(
  featuredImage: string | null,
  postImages: PostImage[] | null | undefined
): ImageDisplayResult {
  const galleryImages = postImages || [];
  const hasFeaturedImage = !!featuredImage;
  const hasGalleryImages = galleryImages.length > 0;
  
  // Case 1: Neither featured nor gallery images
  if (!hasFeaturedImage && !hasGalleryImages) {
    return {
      featuredImage: null,
      galleryImages: [],
      hasBoth: false,
      hasOnlyOne: false,
      hasGallery: false,
    };
  }
  
  // Case 2: Only featured image, no gallery
  if (hasFeaturedImage && !hasGalleryImages) {
    return {
      featuredImage,
      galleryImages: [{ url: featuredImage, alt_text: null, order_index: 0 }],
      hasBoth: false,
      hasOnlyOne: true,
      hasGallery: false,
    };
  }
  
  // Case 3: Only gallery images, no featured
  if (!hasFeaturedImage && hasGalleryImages) {
    // If only one gallery image, use it for both featured and gallery
    if (galleryImages.length === 1) {
      return {
        featuredImage: galleryImages[0].url,
        galleryImages: [galleryImages[0]],
        hasBoth: false,
        hasOnlyOne: true,
        hasGallery: false,
      };
    }
    
    // Multiple gallery images, no featured
    return {
      featuredImage: null,
      galleryImages,
      hasBoth: false,
      hasOnlyOne: false,
      hasGallery: true,
    };
  }
  
  // Case 4: Both featured and gallery images
  return {
    featuredImage,
    galleryImages,
    hasBoth: true,
    hasOnlyOne: false,
    hasGallery: galleryImages.length > 0,
  };
}

/**
 * Gets the primary image to display (for lists, previews, etc.)
 */
export function getPrimaryImage(
  featuredImage: string | null,
  postImages: PostImage[] | null | undefined
): string | null {
  const result = getImageDisplayLogic(featuredImage, postImages);
  return result.featuredImage || (result.galleryImages[0]?.url || null);
}

/**
 * Gets all images for lightbox/gallery display
 */
export function getGalleryImages(
  featuredImage: string | null,
  postImages: PostImage[] | null | undefined
): PostImage[] {
  const result = getImageDisplayLogic(featuredImage, postImages);
  
  // If we have both featured and gallery, include featured as first image
  if (result.hasBoth && result.featuredImage) {
    return [
      { url: result.featuredImage, alt_text: null, order_index: -1 },
      ...result.galleryImages,
    ];
  }
  
  return result.galleryImages;
}

/**
 * Determines if we should show a gallery carousel vs single image
 */
export function shouldShowGallery(
  featuredImage: string | null,
  postImages: PostImage[] | null | undefined
): boolean {
  const result = getImageDisplayLogic(featuredImage, postImages);
  return result.galleryImages.length > 1;
}
