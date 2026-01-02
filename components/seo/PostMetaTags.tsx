import { useEffect } from 'react';

interface PostMetaTagsProps {
  title: string;
  description: string;
  image?: string;
  url: string;
  authorName?: string;
  publishedTime?: string;
}

export const PostMetaTags = ({
  title,
  description,
  image,
  url,
  authorName,
  publishedTime,
}: PostMetaTagsProps) => {
  useEffect(() => {
    // Update document title
    document.title = `${title} | Chronicle`;

    // Helper to set or create meta tag
    const setMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let meta = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard meta
    setMetaTag('description', description, true);
    if (authorName) setMetaTag('author', authorName, true);

    // Open Graph
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:url', url);
    setMetaTag('og:type', 'article');
    if (image) setMetaTag('og:image', image);
    if (publishedTime) setMetaTag('article:published_time', publishedTime);

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image', true);
    setMetaTag('twitter:title', title, true);
    setMetaTag('twitter:description', description, true);
    if (image) setMetaTag('twitter:image', image, true);

    return () => {
      // Reset to default on unmount
      document.title = 'Chronicle - Share Your Stories With The World';
    };
  }, [title, description, image, url, authorName, publishedTime]);

  return null;
};
