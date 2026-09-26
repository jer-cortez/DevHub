export async function preview(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "images.example.com") throw new Error("invalid URL");
  return fetch(url).then((response) => response.text());
}
