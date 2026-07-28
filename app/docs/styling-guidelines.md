# Guía de estilos de Gonezo

## Capas y dependencias

La única jerarquía permitida es:

```text
Bootstrap Sass configuration
↓
Bootstrap CSS variables
↓
Gonezo semantic tokens
↓
Bootstrap utilities and Gonezo primitives
↓
CSS Module owned by the component
```

- `src/styles/bootstrap.scss`: configura e importa Bootstrap una sola vez; es responsable de layout, grid, responsive y utilidades.
- `src/styles/_theme-colors.generated.scss`: manifiesto generado desde `src/styles/theme-colors.json`; solo alimenta la capa Bootstrap.
- `src/styles/_gonezo-tokens.scss`: contiene significado visual, escalas, geometría estructural, motion y temas light/dark.
- `src/shared/ui/primitives.css`: solo patrones neutrales compartidos con prefijo `gz-`.
- `*.module.css`: estilos internos del componente propietario.
- Los bounded contexts no importan CSS interno entre sí. Los estilos heredados en allowlist se migran de forma incremental.

Los componentes consumen tokens Gonezo (`--color-surface`, `--color-text-primary`, `--color-action-primary`, `--color-income`, etc.), nunca colores Bootstrap, hexadecimales ni CSS interno de otro componente.

## Escalas

Spacing: `--space-2xs`, `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`, `--space-2xl`, `--space-3xl`.

Tipografía: `--font-size-*`, `--line-height-*`, `--font-weight-*` y roles `--type-*`. Usa Bootstrap para estructura y la escala para ritmo visual; no conviertas valores internos de ilustraciones en tokens globales.

## Responsive

Usa las utilidades Bootstrap y sus breakpoints `sm`, `md`, `lg`, `xl`, `xxl`. Una media query inferior a `sm` requiere un comentario junto a la excepción explicando qué contenido no cabe. Todo componente compartido debe tolerar 320px, textos traducidos, importes largos, zoom y wrap/truncado explícito.

Las alturas sticky, safe areas, navegación inferior, máximos de contenido, sheets y modales usan tokens estructurales. No uses offsets numéricos arbitrarios ni `z-index` numérico.

## Temas y estados

`[data-bs-theme="light"]` y `[data-bs-theme="dark"]` definen el contrato completo. La aplicación mantiene light por defecto. Marca, acción primaria, income, expense, transfer, success, warning y error son significados distintos.

Los primitives interactivos deben conservar foco visible, mínimo táctil (`--touch-target-min`), disabled, selected, loading cuando aplique y estados hover/active. Las variantes se expresan mediante unions (`variant="primary"`, `size="compact"`), no mediante combinaciones de booleanos ni overrides del consumidor.

La política global de motion usa `--motion-duration-*`, `--motion-easing-standard` y `prefers-reduced-motion: reduce`; no se eliminan indicadores funcionales de progreso.

## Cuándo crear un primitive

Crea un primitive únicamente si existe un patrón neutral repetido con más de un consumidor: `IconButton`, `TextButton`, `StatusBadge`, `Amount`, `Surface`, `Stack`, `Inline`, `Divider`, `SectionHeader`, `EmptyState` o `FormField`. Cada uno debe tener una responsabilidad, API tipada, foco/accesibilidad y contrato responsive propios. No crees un `Card` universal con decenas de variantes.

## Quality gates

```bash
npm run lint
npm run stylelint
npm run test
npm run build
npm run check
```

El checker bloquea colores directos fuera del tema, `!important`, z-index numérico, variables inexistentes, colores Bootstrap directos en componentes, imports CSS entre contextos, múltiples imports de Bootstrap y nuevas hojas CSS globales fuera de la allowlist. La allowlist existente es deuda de migración y debe reducirse por bounded context. `--bs-*` solo puede aparecer en archivos del tema.

## Deuda legacy

| archivo | bounded context | motivo por el que sigue global | plan de migración |
|---|---|---|---|
| `src/account/application/AccountSummary/AccountSummaryComponent.css` | account | Composición de app shell todavía compartida con vistas antiguas | Migrar cuando la pantalla de account se pase a CSS Modules completos |
| `src/account/ui/AccountSwitcher/AccountSwitcherView.css` | account | Reutilizado por el flujo de cambio de cuenta | Convertir a Module cuando el switcher tenga owner claro |
| `src/imports/ui/TransactionsImportView.css` | imports | Pantalla legacy de importación con dependencias compartidas | Encapsular al tocar el flujo de importación |
| `src/movements/ui/MonthNavigator/MonthNavigatorView.css` | movements | Navegación sticky reutilizada por varias vistas | Migrar con el shell de movements |
| `src/movements/ui/MonthPickerModal/MonthPickerModalView.css` | movements | Modal con selectores compartidos y portal | Convertir cuando el modal quede local al componente |
| `src/movements/ui/MonthlyMovements/MonthlyMovementsView.css` | movements | Vista legacy aún con layout global parcial | Migrar cuando se normalice el timeline |
| `src/movements/ui/MovementDetail/MovementDetailView.css` | movements | Detalle con dependencias históricas y sticky structure | Separar en Module por subcomponentes |
| `src/movements/ui/MovementSection/MovementSectionView.css` | movements | Sección compartida dentro de la pantalla legacy | Migrar junto con el detalle |
| `src/movements/ui/MovementsSearch/MovementsSearch.css` | movements | Búsqueda de movimientos con selectores globales existentes | Encapsular cuando el buscador pase a Module |
| `src/movements/ui/YearMonthSelector/YearMonthSelectorView.css` | movements | Selector de periodo todavía consumido por varias pantallas | Migrar sin cambiar el contrato de teclado |
| `src/movements/ui/movements.css` | movements | Estilos agregados del shell de movements | Reducir a primitives o Modules por vista |
| `src/shared/ui/BottomNavigation/BottomNavigationView.css` | shared/ui | Navegación fija del app shell | Migrar solo si el shell deja de compartir el mismo contenedor |
| `src/shared/ui/FloatingActionButton/FloatingActionButtonView.css` | shared/ui | Botón flotante controlado por safe area del shell | Pasar a Module cuando el shell exponga el slot local |
| `src/shared/ui/MultiTagPicker/MultiTagPickerView.css` | shared/ui | Selector con interacciones compartidas entre flujos | Convertir cuando deje de ser consumido por varios contextos |
| `src/shared/ui/SelectChip/SelectChipView.css` | shared/ui | Chip compartido de selección | Migrar en paralelo con MultiTagPicker |
| `src/shared/ui/SplitFloatingAction/SplitFloatingActionView.css` | shared/ui | Acción flotante compuesta del shell | Mantener global hasta que deje de depender de coordinación del shell |
| `src/shared/ui/detailSheet.css` | shared/ui | Sheet con comportamiento de portal y estructura común | Migrar por piezas cuando los consumers tengan Module propio |
| `src/transactions/ui/CategoryPickerField/CategoryPickerField.css` | transactions | Campo con interacción de chip compartido | Convertir a Module cuando el composer termine la refactorización |
| `src/transactions/ui/ComposerModePicker/ComposerModePickerView.css` | transactions | Switcher legacy del composer | Migrar al estabilizar el composer |
| `src/transactions/ui/ExperimentalMovementDockNavigation/ExperimentalMovementDockNavigationView.css` | transactions | Dock experimental todavía compartido con el shell | Mantener mientras siga fuera del árbol normal |
| `src/transactions/ui/ItemBreakdownControls/ItemBreakdownControlsView.css` | transactions | Controles compartidos dentro del editor legacy | Encapsular cuando el editor pase a Module completo |
| `src/transactions/ui/MovementAccountSelector/MovementAccountSelectorView.css` | transactions | Selector usado por composer y movimientos | Migrar al reducir dependencias cruzadas |
| `src/transactions/ui/MovementDraftPicker/MovementDraftPickerView.css` | transactions | Picker legacy del composer | Convertir con el composer cuando quede modular |
| `src/transactions/ui/MovementMoreControls/MovementMoreControlsView.css` | transactions | Panel de acciones compartidas del composer | Migrar junto con el composer completo |
| `src/transactions/ui/MovementTypeSelector/MovementTypeSelectorView.css` | transactions | Selector legacy con estados compartidos | Encapsular con la siguiente iteración del composer |
| `src/transactions/ui/MovementVoiceEntry/MovementVoiceEntryView.css` | transactions | Integración con estados y controles del shell | Mantener mientras dependa de permisos/voice flow |
| `src/transactions/ui/MovementVoiceEntry/MovementVoicePermissionDialog.css` | transactions | Diálogo de permisos con clases globales del shell | Migrar cuando la integración de voz se aísle |
| `src/transactions/ui/RecurrenceEditor/RecurrenceEditorView.css` | transactions | Editor legacy de recurrencias | Convertir al modernizar el flujo de schedule |
| `src/transactions/ui/ScheduleControls/ScheduleControlsView.css` | transactions | Controles de recurrencia aún compartidos | Migrar con RecurrenceEditor |
| `src/transactions/ui/TransactionComposer/TransactionComposerView.css` | transactions | Composer legacy con mucha coordinación interna | Convertir por subcomponentes cuando el refactor esté cerrado |
| `src/transactions/ui/TransactionComposerActions/TransactionComposerActionsView.css` | transactions | Barra de acciones del composer | Migrar con el composer |
| `src/transactions/ui/TransactionMainFields/TransactionMainFieldsView.css` | transactions | Campos principales aún compartidos | Encapsular con el composer |

## Checklist para un componente nuevo

- [ ] ¿Pertenece al bounded context correcto y usa CSS Module?
- [ ] ¿Consume tokens semánticos y no valores visuales duplicados?
- [ ] ¿Tiene variante explícita en su API si el estado cambia?
- [ ] ¿Tiene foco, disabled, tamaño táctil y reduced motion?
- [ ] ¿Funciona a 320px, con textos/importes largos, zoom y ambos temas?
- [ ] ¿Tiene tests de contrato y no añade imports CSS cruzados?
- [ ] ¿Se ejecutaron `lint`, `stylelint`, `test`, `build` y `check`?
