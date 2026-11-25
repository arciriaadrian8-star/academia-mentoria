# Recordatorios de pago con Cowork (desde tu WhatsApp)

Cowork abre la academia, lee la página **Mensajes de hoy** y envía cada recordatorio desde tu WhatsApp
(WhatsApp Web o la app de escritorio) y, si hace falta, por el chat de Skool. Los datos (número, valor,
fecha y mensaje) salen siempre de la academia, así que lo que mantengas al día en el **Control de alumnos**
es lo que se envía.

## Antes de empezar (una sola vez)

1. En **Miembros → Control de alumnos → Datos de cobro** escribe tu número de Nequi, tu enlace de Wompi y
   revisa los mensajes. «Recordar cuántos días antes» = **1**. Deja **apagado** «Enviar por la API de WhatsApp Business».
2. Abre **Mensajes de hoy** y mira «Datos por completar»: todo alumno de Nequi/Wompi necesita WhatsApp,
   valor y fecha de pago.
3. En el computador donde corre Cowork, deja abierta la sesión de la academia (como admin) y de WhatsApp Web
   (o WhatsApp de escritorio) y, si usas Skool, de Skool.

## Tarea programada en Cowork

Crea en Cowork una tarea programada **todos los días a las 9:00 a.m.** con este texto:

> Abre https://TU-ACADEMIA/miembros/alumnos/hoy (ya tengo la sesión iniciada como admin).
> Para cada alumno con estado «Pendiente», en orden:
> 1. Pulsa «Abrir chat de WhatsApp» (abre WhatsApp con su número y el mensaje ya escrito). Si no abre,
>    busca en WhatsApp el número exacto que aparece en «WhatsApp:» y pega el «Mensaje a enviar» con «Copiar mensaje».
> 2. Revisa que el chat sea el del número correcto y envía el mensaje sin cambiar el valor, la fecha ni los datos de pago.
> 3. Vuelve a la academia y pulsa «Marcar enviado por WhatsApp».
> 4. Si el alumno paga por Skool o también está en mi comunidad de Skool, envíale el mismo mensaje por el chat de
>    Skool (búscalo por nombre o correo) y pulsa «Marcar enviado por Skool».
> No envíes nada a los que dicen «Enviado». No escribas a números que no estén en la página.
> Al final dime: cuántos enviaste, a quién no pudiste (y por qué), y la lista de «Datos por completar».

Cambia `TU-ACADEMIA` por la dirección de tu academia.

## Qué recibe cada alumno

| Cuándo | Mensaje (editable en Datos de cobro) |
|---|---|
| 1 día antes de su fecha de pago | Recordatorio con el valor, tu Nequi y tu enlace de Wompi |
| El día del pago, si no has registrado el pago | El mismo recordatorio |
| 2 días después, si sigue sin pago | Mensaje de pago atrasado |

Cuando el alumno te mande el comprobante, pulsa **Pagó** en el Control de alumnos (o registra el pago en su
ficha): su fecha se corre al siguiente mes y deja de aparecer en los recordatorios. Así la barra de
**Renovación de este mes** muestra si vas por encima del 80 %.
