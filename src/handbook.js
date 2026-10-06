// Highlight the sidebar entry for the section currently in view.
const links = new Map([...document.querySelectorAll(".toc nav a")].map((a) => [a.hash.slice(1), a]));
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of links.values()) a.classList.remove("on");
      links.get(e.target.id)?.classList.add("on");
    }
  },
  { rootMargin: "-20% 0px -70% 0px" },
);
for (const id of links.keys()) {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
}
