export async function preview(url: string) {
  return fetch(url).then((response) => response.text());
}
