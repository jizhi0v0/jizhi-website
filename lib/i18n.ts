// 数据层的 locale 标识。UI 文案/路由已迁到 next-intl（见 i18n/、messages/）；
// 这里只保留「按 locale 取内容」用到的类型与日期格式化。
export type Locale = "zh" | "en";

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 文章页的完整日期：zh「2026 年 5 月 30 日」/ en「May 30, 2026」。 */
export function formatFull(d: string, locale: Locale): string {
  const [y, m, day] = d.split("-");
  if (locale === "en") {
    return `${EN_MONTHS[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
  }
  return `${y} 年 ${parseInt(m, 10)} 月 ${parseInt(day, 10)} 日`;
}
