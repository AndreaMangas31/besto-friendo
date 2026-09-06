from app.features.commands.models import CommandCatalogResponse, CommandHelpItem

# Frases alineadas con el detector en service.py. Si añades un comando, entra aquí.
CATALOG = CommandCatalogResponse(
    items=[
        CommandHelpItem(
            id="enable_japanese_mode",
            title="Activar tutor",
            example="enable japanese mode",
            description="Abre el chat de práctica de japonés. También vale ‘Besto Friendo, activa japonés’.",
            group="tutor",
        ),
        CommandHelpItem(
            id="disable_japanese_mode",
            title="Cerrar tutor",
            example="disable japanese mode",
            description="Cierra el chat y vuelve a la pantalla de comandos.",
            group="tutor",
        ),
        CommandHelpItem(
            id="set_practice_mode",
            title="Cambiar modo",
            example="modo corregir",
            description="Pasa a Conversar, Corregir o Darme ideas. Di ‘modo’ más el nombre.",
            group="tutor",
        ),
        CommandHelpItem(
            id="enable_conversation_mode",
            title="Activar conversación",
            example="enable conversation mode",
            description="Abre el chat con Hermes (preguntas, explicaciones, búsqueda web). También vale ‘activa modo conversación’.",
            group="chat",
        ),
        CommandHelpItem(
            id="disable_conversation_mode",
            title="Cerrar conversación",
            example="disable conversation mode",
            description="Cierra el chat y vuelve a los comandos de casa.",
            group="chat",
        ),
        CommandHelpItem(
            id="tv_power_on",
            title="Encender tele",
            example="enciende la tele",
            description="Despierta o enciende el Chromecast / la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_power_off",
            title="Apagar tele",
            example="apaga la tele",
            description="Apaga o pone a dormir la tele. Hace falta decir tele/tv.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_volume_up",
            title="Subir volumen",
            example="sube el volumen",
            description="Sube el volumen de la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_volume_down",
            title="Bajar volumen",
            example="baja el volumen",
            description="Baja el volumen de la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_mute",
            title="Silenciar",
            example="mute",
            description="Quita o pone el sonido. ‘Silencio’ necesita mencionar la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_home",
            title="Menú de inicio",
            example="vuelve al menú",
            description="Va al menú de apps de la tele. También: home, inicio.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_back",
            title="Atrás",
            example="atrás en la tele",
            description="Pulsa atrás en la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_play_pause",
            title="Play / pausa",
            example="pausa la tele",
            description="Pausa o reanuda lo que se esté reproduciendo.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_open_youtube",
            title="Abrir YouTube",
            example="abre youtube",
            description="Lanza YouTube en la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_open_netflix",
            title="Abrir Netflix",
            example="abre netflix",
            description="Lanza Netflix en la tele.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_search",
            title="Buscar en la tele",
            example="ok tele gatos",
            description="Escribe en la búsqueda de la pantalla lo que digas después de ‘ok tele’.",
            group="tv",
        ),
        CommandHelpItem(
            id="tv_hdmi",
            title="Entrada HDMI",
            example="hdmi 1",
            description="Mismo gesto para 1–4: al primero de Entradas y luego N abajo (hdmi 2 = una más que hdmi 1).",
            group="tv",
        ),
        CommandHelpItem(
            id="ps5_power_on",
            title="Encender PlayStation",
            example="enciende la PS5",
            description="Despierta la consola y pone la tele en HDMI 1.",
            group="ps5",
        ),
        CommandHelpItem(
            id="ps5_power_off",
            title="Reposo PlayStation",
            example="apaga la PlayStation",
            description="La manda a reposo, no al menú Apagar PS5. También: duerme la play.",
            group="ps5",
        ),
        CommandHelpItem(
            id="heating_power_on",
            title="Encender calefacción",
            example="enciende la calefacción",
            description="Pone la zona en modo manual (MIGo Link).",
            group="heating",
        ),
        CommandHelpItem(
            id="heating_power_off",
            title="Apagar calefacción",
            example="apaga la calefacción",
            description="Apaga la zona. Hace falta decir calefacción/termostato.",
            group="heating",
        ),
        CommandHelpItem(
            id="heating_temp_up",
            title="Subir un grado",
            example="sube la calefacción",
            description="Suma 1 °C a la consigna. No uses ‘sube’ suelto (eso es volumen).",
            group="heating",
        ),
        CommandHelpItem(
            id="heating_temp_down",
            title="Bajar un grado",
            example="baja la calefacción",
            description="Resta 1 °C a la consigna.",
            group="heating",
        ),
        CommandHelpItem(
            id="heating_set_temp",
            title="Poner temperatura",
            example="pon 21 grados",
            description="Fija esa consigna. También: pon la calefacción a 21.",
            group="heating",
        ),
    ]
)


def get_catalog() -> CommandCatalogResponse:
    return CATALOG
