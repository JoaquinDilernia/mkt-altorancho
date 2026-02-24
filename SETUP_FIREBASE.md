# Configuración de Firebase - Marketing Altorancho

## Estructura de Firestore

### Colección: `marketingar_users`

Cada documento tiene la siguiente estructura:

```json
{
  "username": "sofi",
  "password": "sofi123",
  "name": "Sofi",
  "role": "admin",
  "areas": ["Coordinación Marketing"],
  "partTime": false,
  "active": true
}
```

## Usuarios del sistema:

### ADMIN:
- **Username:** sofi
- **Password:** sofi123
- **Nombre:** Sofi
- **Role:** admin

### USUARIOS:

1. **Trini** - trini / trini123
   - Areas: Marketing Ecommerce, Locales, UX, Email Marketing

2. **Vicky** - vicky / vicky123
   - Areas: Marketing Social, Contenidos, Influencers, Prensa

3. **Juli** - juli / juli123
   - Areas: Diseño Gráfico, Video

4. **Joaco** - joaco / joaco123
   - Areas: Ecommerce, Sistemas

5. **Cami** - cami / cami123
   - Areas: Publicidad Digital, Performance

6. **Caro** - caro / caro123
   - Areas: Visual Merchandising (Part time)

7. **Mili** - mili / mili123
   - Areas: Atención al Cliente, Experiencia de Compra

## Pasos para configurar:

1. Ir a Firebase Console: https://console.firebase.google.com/
2. Seleccionar proyecto: **pedidos-lett-2**
3. Ir a **Firestore Database**
4. Crear la colección `marketingar_users`
5. Agregar un documento por cada usuario (usar username como ID o autogenerar)
6. Copiar los datos del archivo `src/utils/setupUsers.js`

**Importante:** Cambiar las contraseñas en producción.
