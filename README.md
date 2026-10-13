# Auto Imágenes · Grupo Alterra

Herramienta web interna para preparar enlaces de imágenes de ecommerce y facilitar su carga en cPanel.

## ¿Qué hace?

- Selecciona una carpeta completa o archivos de imagen individuales.
- Detecta el código numérico al inicio del nombre de cada archivo.
- Genera una vista previa con el código, la URL y el nombre de archivo.
- Copia los resultados o los descarga como archivo `.txt` separado por tabuladores.
- Abre el cargador de cPanel directamente en la carpeta de imágenes de ecommerce.

> Los archivos sin un código numérico al inicio se excluyen de la lista. Por ejemplo, `1108.webp` genera el código `1108` y conserva su extensión.

## Uso

1. Abre la página de la herramienta.
2. Selecciona una carpeta de imágenes o elige archivos individuales.
3. Revisa la vista previa y, si hace falta, ajusta la URL base.
4. Pulsa **Copiar** o **Descargar TXT** para obtener la lista de enlaces.
5. Pulsa **Abrir cargador de cPanel**. Inicia sesión en cPanel si te lo solicita y utiliza su selector para cargar los archivos en la carpeta indicada.

La carga se realiza en la interfaz oficial de cPanel. La herramienta no almacena tu contraseña ni requiere un token API.

## Publicar con GitHub Pages

Este proyecto es una página estática. Para publicarlo desde GitHub:

1. Sube los archivos del sitio al repositorio, incluyendo `index.html`, `app.css` y `app.js`.
2. Abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona la rama `main` y la carpeta `/(root)`, y guarda los cambios.
5. Cuando termine la publicación, GitHub mostrará la dirección del sitio en esa misma sección.

Cada cambio enviado a la rama y carpeta seleccionadas se publicará automáticamente.

> GitHub Pages publica el sitio en Internet. Si usas GitHub Free, el repositorio debe ser público para habilitar Pages. No subas contraseñas, tokens ni archivos privados al repositorio.

## Ejecución local opcional

En Windows, ejecuta `iniciar_local.bat` para abrir la página en el navegador mediante el servidor local de Python. Necesitas tener Python 3 instalado.

## Archivos principales

| Archivo | Descripción |
| --- | --- |
| `index.html` | Estructura de la página |
| `app.css` | Estilos y diseño |
| `app.js` | Selección de imágenes y generación del TXT |
| `servidor_local.py` | Servidor local opcional |
| `iniciar_local.bat` | Acceso para iniciar el servidor local en Windows |
