export interface SEOMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'property';
}

export function updateMetaTags(metadata: SEOMetadata) {
  // Update title
  document.title = metadata.title;

  // Update or create description meta tag
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', metadata.description);

  // Update Open Graph tags
  updateOGTag('og:title', metadata.title);
  updateOGTag('og:description', metadata.description);
  if (metadata.image) updateOGTag('og:image', metadata.image);
  if (metadata.url) updateOGTag('og:url', metadata.url);
  if (metadata.type) updateOGTag('og:type', metadata.type);

  // Update Twitter Card tags
  updateMetaTag('twitter:title', metadata.title);
  updateMetaTag('twitter:description', metadata.description);
  if (metadata.image) updateMetaTag('twitter:image', metadata.image);
}

function updateOGTag(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function updateMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Structured Data (JSON-LD) with support for multiple scripts
export function addStructuredData(data: any, key: string = 'default') {
  const scriptId = `ld-json-${key}`;
  let script = document.querySelector(`script#${scriptId}`);
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', scriptId);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

// Remove structured data by key
export function removeStructuredData(key: string) {
  const scriptId = `ld-json-${key}`;
  const script = document.querySelector(`script#${scriptId}`);
  if (script) {
    script.remove();
  }
}

export function getPropertyStructuredData(property: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: property.title,
    description: property.description || 'Property listing',
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.city || '',
      addressRegion: property.state || '',
      postalCode: property.zip_code || property.zip || '48083'
    },
    priceCurrency: 'USD',
    price: property.price ? property.price.toString() : '0',
    priceSpecification: {
      '@type': 'PriceSpecification',
      priceCurrency: 'USD',
      price: property.price ? property.price.toString() : '0'
    },
    numberOfRooms: property.bedrooms ? property.bedrooms.toString() : '0',
    floorSize: {
      '@type': 'QuantitativeValue',
      value: (property.square_feet || property.sqft || 0).toString(),
      unitCode: 'SQM'
    }
  };
}

export function getOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Choice Properties Inc.',
    url: 'https://choiceproperties.com',
    logo: 'https://choiceproperties.com/logo.png',
    description: 'Your trusted rental housing partner. Browse properties, apply online, and find your perfect home in Troy, MI.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2265 Livernois, Suite 500',
      addressLocality: 'Troy',
      addressRegion: 'MI',
      postalCode: '48083',
      addressCountry: 'US'
    },
    telephone: '+1-707-706-3137',
    email: 'info@choiceproperties.com',
    sameAs: [
      'https://www.facebook.com/choiceproperties',
      'https://www.instagram.com/choiceproperties',
      'https://www.twitter.com/choiceproperties'
    ],
    priceRange: '$$$'
  };
}

export function getBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function getSearchActionStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://choiceproperties.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://choiceproperties.com/properties?search={search_term_string}'
      },
      query_input: 'required name=search_term_string'
    }
  };
}

export function setCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function updateDynamicMeta(key: string, content: string, isProperty: boolean = false) {
  const attribute = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}
