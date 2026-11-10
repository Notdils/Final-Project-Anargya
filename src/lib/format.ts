export const yen = (n: number) => `¥ ${Math.round(n).toLocaleString("en-US")}`;
export const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const jst = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso)) + " JST";
