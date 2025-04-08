import Particles, { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useMemo, useState, useContext } from "react";
import { loadSlim } from "@tsparticles/slim"; // Using slim for better performance
import { ThemeContext } from '../context/ThemeContext'; // Import your ThemeContext

const ParticlesComponent = (props) => {
  const [init, setInit] = useState(false);
  const { theme } = useContext(ThemeContext); // Access theme

  // Initialize tsParticles engine once
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine); // Load slim version
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = (container) => {
    console.log("Particles loaded:", container);
  };

  // Memoize options to prevent unnecessary re-renders, dynamically adjust based on theme
  const options = useMemo(
    () => ({
      background: {
        color: {
          value: theme === 'dark' ? '#1a202c' : '#ffffff', // Match your theme
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "repulse",
          },
          onHover: {
            enable: true,
            mode: "grab",
          },
        },
        modes: {
          push: {
            distance: 200,
            duration: 15,
          },
          grab: {
            distance: 150,
          },
        },
      },
      particles: {
        color: {
          value: theme === 'dark' ? '#ffffff' : '#000000', // Contrast with background
        },
        links: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
          distance: 150,
          enable: true,
          opacity: 0.3,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: {
            default: "bounce",
          },
          random: true,
          speed: 1,
          straight: false,
        },
        number: {
          density: {
            enable: true,
          },
          value: 300,
        },
        opacity: {
          value: 1.0,
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 3 },
        },
      },
      detectRetina: true,
    }),
    [theme] // Recompute when theme changes
  );

  if (!init) return null; // Don’t render until initialized

  return <Particles id={props.id} init={particlesLoaded} options={options} />;
};

export default ParticlesComponent;