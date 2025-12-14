import ImageKit from "imagekit";

let imagekit: ImageKit | null = null;

// Only initialize ImageKit if all required credentials are present
if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
} else {
  console.warn("[IMAGEKIT] Warning: ImageKit is not fully configured. Image operations will fail.");
  console.warn("[IMAGEKIT] Required environment variables: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT");
}

export default imagekit;
