import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 🔥 FUNÇÃO PARA FORÇAR FAVICON
function setFavicon(url: string) {
  const link =
    document.querySelector("link[rel~='icon']") ||
    document.createElement("link");

  link.setAttribute("rel", "icon");
  link.setAttribute("type", "image/png");
  link.setAttribute("href", url + "?v=" + new Date().getTime());

  document.head.appendChild(link);
}

// 🔥 DEFINE SUA LOGO AQUI
setFavicon("/favicon-32x32.png");

createRoot(document.getElementById("root")!).render(<App />);