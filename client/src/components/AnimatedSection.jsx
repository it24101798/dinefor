import { useEffect, useRef, useState } from "react";

function AnimatedSection({ children, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={`reveal ${visible ? "show" : ""} ${className}`}>
      {children}
    </section>
  );
}

export default AnimatedSection;
