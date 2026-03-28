/**
 * @fileoverview Main entrypoint. Overwrites vite default.
 */
import './index.css';
import { App } from './App.js';

document.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.getElementById('loading-screen');
  const canvas = document.getElementById('game-canvas');
  const uiLayer = document.getElementById('ui-layer');
  
  if (!canvas || !uiLayer) {
      console.error("Critical elements not found!");
      return;
  }

  try {
     const app = new App(canvas, uiLayer);
     
     if (loadingScreen) {
        // Wait for first user interaction before playing audio 
        // We handle this inside MainMenu Screen, so we can just show it right away
        setTimeout(() => {
           loadingScreen.style.opacity = '0';
           app.start();
           setTimeout(() => loadingScreen.remove(), 500);
        }, 500);
     } else {
        app.start();
     }
  } catch(e) {
     console.error("Failed to start TapTap:", e);
     if(loadingScreen) loadingScreen.innerHTML = `<div style="color:red; font-family:sans-serif"><h1>Error</h1>${e.message}</div>`;
  }
});
