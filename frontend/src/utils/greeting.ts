/**
 * Time-based greeting helper.
 */
export function timeGreeting(name?: string) {
  const h = new Date().getHours();
  let greet = "Hello";
  let emoji = "👋";
  if (h < 5) { greet = "Working late"; emoji = "🌙"; }
  else if (h < 12) { greet = "Good morning"; emoji = "☀️"; }
  else if (h < 17) { greet = "Good afternoon"; emoji = "🚀"; }
  else if (h < 21) { greet = "Good evening"; emoji = "🌇"; }
  else { greet = "Good night"; emoji = "✨"; }
  const first = (name || "").split(" ")[0] || "";
  return { greet, emoji, first };
}
