// SVG placeholder for missing images
export const getPlaceholderSvg = (): string => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f0f0f0' width='400' height='400'/%3E%3Cg opacity='0.3'%3E%3Cpath fill='%23999' d='M160 140c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm0 60c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20z'/%3E%3Cpath fill='%23999' d='M360 100H40v200h320V100zm-20 20v130l-80-80-60 60-80-80-40 40V120h260z'/%3E%3C/g%3E%3Ctext x='200' y='220' font-family='system-ui, -apple-system, sans-serif' font-size='16' fill='%23999' text-anchor='middle'%3EImage not available%3C/text%3E%3C/svg%3E`;
};

// Fallback for broken images
export const getFallbackImageUrl = (width: number = 400, height: number = 400): string => {
  return getPlaceholderSvg();
};
