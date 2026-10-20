import { useEffect, useRef, useState } from "react";

// Fait apparaître doucement son contenu quand il entre à l'écran
export default function Apparition({ as: Tag = "div", delai = 0, className = "", children, ...p }) {
  const ref = useRef(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVu(true); return; }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); o.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`apparition ${vu ? "vu" : ""} ${className}`} style={{ transitionDelay: delai + "ms" }} {...p}>
      {children}
    </Tag>
  );
}
