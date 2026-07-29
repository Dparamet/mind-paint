# Text, Shapes, and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver polished contextual text formatting, a reliable categorized Shapes dropdown, and an accessible whole-canvas Export dropdown.

**Architecture:** Keep editor data and canvas rendering in the existing Zustand/Konva boundaries. Improve the two dropdowns locally in `Toolbar.tsx` and `Topbar.tsx`, and make text controls derive their display state from the selected text element while continuing to persist editor defaults.

**Tech Stack:** React 19, TypeScript 5.9, Zustand, React-Konva/Konva, TailwindCSS, Vitest, Testing Library.

## Global Constraints

- Modify only Text, geometry/decorative Shapes, and whole-canvas Export behavior.
- Preserve the existing project JSON schema and current layer/project behavior.
- Export formats are PNG @3x, Transparent PNG, JPEG @3x, SVG, PDF, and Project JSON.
- Do not add dependencies.
- Menus must close after selection, on outside pointer interaction, and on `Escape`.

---

### Task 1: Contextual Text Formatting

**Files:**
- Modify: `src/components/Topbar.tsx`
- Test: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Consumes: `TextElement` fields `fontSize`, `fontFamily`, `fontStyle`, `align`, and `fill`.
- Produces: top-bar controls named `Font family`, `Font size`, `Bold`, `Italic`, `Text align left`, `Text align center`, and `Text align right`.

- [ ] **Step 1: Write failing contextual-control tests**

Add a text element to the store, select it, render `Topbar`, and assert that the controls reflect the element rather than unrelated editor defaults:

```tsx
it('shows and updates formatting for the selected text element', async () => {
  const user = userEvent.setup();
  const text = {
    id: 'text-1',
    layerId: useEditorStore.getState().activeLayerId,
    type: 'text' as const,
    text: 'Hello',
    x: 20,
    y: 30,
    width: 240,
    fontSize: 28,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic bold',
    align: 'right' as const,
    stroke: '#00000000',
    fill: '#17202a',
    strokeWidth: 0,
  };
  useEditorStore.getState().addElement(text);
  useEditorStore.getState().setSelectedElementId(text.id);

  render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

  expect(screen.getByRole('spinbutton', { name: 'Font size' })).toHaveValue(28);
  expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Text align right' })).toHaveAttribute('aria-pressed', 'true');

  await user.click(screen.getByRole('button', { name: 'Text align center' }));
  expect(useEditorStore.getState().elements.find((element) => element.id === text.id)).toMatchObject({ align: 'center' });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx
```

Expected: FAIL because text alignment buttons do not exist and control values come only from editor defaults.

- [ ] **Step 3: Derive contextual values and add alignment controls**

In `Topbar`, derive the first selected text element and normalized style flags:

```tsx
const selectedText = selectedEls.find((element) => element.type === 'text');
const textFontSize = selectedText?.fontSize ?? state.fontSize;
const textFontFamily = selectedText?.fontFamily ?? state.fontFamily;
const textBold = selectedText ? selectedText.fontStyle?.includes('bold') ?? false : state.bold;
const textItalic = selectedText ? selectedText.fontStyle?.includes('italic') ?? false : state.italic;
const textAlign = selectedText?.align ?? state.textAlign;
```

Use these values in the existing font, bold, and italic controls. Update `handleBold` and `handleItalic` to receive the displayed companion style so selected elements retain both flags:

```tsx
function handleBold(bold: boolean, italic = state.italic) {
  state.setBold(bold);
  selectedEls
    .filter((element) => element.type === 'text')
    .forEach((element) =>
      state.updateElement(element.id, {
        fontStyle: `${italic ? 'italic ' : ''}${bold ? 'bold' : 'normal'}`.trim(),
      } as Partial<CanvasElement>),
    );
}
```

Add a text alignment handler and three accessible buttons:

```tsx
function handleTextAlign(align: 'left' | 'center' | 'right') {
  state.setTextAlign(align);
  selectedEls
    .filter((element) => element.type === 'text')
    .forEach((element) => state.updateElement(element.id, { align } as Partial<CanvasElement>));
}
```

```tsx
{(['left', 'center', 'right'] as const).map((align) => (
  <button
    key={align}
    aria-label={`Text align ${align}`}
    aria-pressed={textAlign === align}
    className={`icon-button h-8 w-8 ${textAlign === align ? 'border-accent bg-accent/10 text-accent' : ''}`}
    onClick={() => handleTextAlign(align)}
  >
    {align === 'left' ? <AlignLeft size={14} /> : align === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
  </button>
))}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.tsx src/test/toolbar-layout.test.tsx
git commit -m "feat: polish contextual text formatting"
```

---

### Task 2: Reliable Shapes Dropdown

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Test: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Consumes: `Tool` values for rectangle, circle, triangle, diamond, pentagon, hexagon, octagon, and star.
- Produces: an accessible `Shape tools` menu whose trigger can open and close reliably.

- [ ] **Step 1: Write failing trigger and outside-close tests**

```tsx
it('toggles the shape menu from its trigger', async () => {
  const user = userEvent.setup();
  render(<Toolbar />);
  const trigger = screen.getByRole('button', { name: 'Shapes' });

  await user.click(trigger);
  expect(screen.getByRole('menu', { name: 'Shape tools' })).toBeInTheDocument();
  await user.click(trigger);
  expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
});

it('closes the shape menu after an outside pointer interaction', async () => {
  const user = userEvent.setup();
  render(<Toolbar />);
  await user.click(screen.getByRole('button', { name: 'Shapes' }));
  await user.click(document.body);
  expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify the trigger test fails**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx
```

Expected: the second trigger click leaves the menu open because the global pointer handler and trigger click race.

- [ ] **Step 3: Include the trigger in the dropdown boundary**

Add a trigger ref:

```tsx
const shapeTriggerRef = useRef<HTMLButtonElement>(null);
```

Update the outside-pointer condition:

```tsx
const closeOnOutsideClick = (event: PointerEvent) => {
  const target = event.target as Node;
  if (!popoverRef.current?.contains(target) && !shapeTriggerRef.current?.contains(target)) {
    setShapesOpen(false);
  }
};
```

Attach `ref={shapeTriggerRef}` to the Shapes button and set `aria-controls="shape-tools-menu"`. Set `id="shape-tools-menu"` on the menu. Preserve the three existing categories and active shape icon behavior.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/test/toolbar-layout.test.tsx
git commit -m "fix: make shapes dropdown reliable"
```

---

### Task 3: Accessible Export Dropdown

**Files:**
- Modify: `src/components/Topbar.tsx`
- Test: `src/test/toolbar-layout.test.tsx`
- Test: `src/test/exportUtils.test.ts`

**Interfaces:**
- Consumes: existing `exportImage`, `exportPdf`, `exportSvg`, `downloadJson`, and `runExport` paths.
- Produces: an `Export formats` menu with menu items named PNG @3x, Transparent PNG, JPEG @3x, SVG, PDF, and Project JSON.

- [ ] **Step 1: Write failing export-menu tests**

```tsx
it('offers every whole-canvas export format in an accessible menu', async () => {
  const user = userEvent.setup();
  render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

  await user.click(screen.getByRole('button', { name: 'Export' }));
  const menu = screen.getByRole('menu', { name: 'Export formats' });
  expect(menu).toBeInTheDocument();
  for (const name of ['PNG @3x', 'Transparent PNG', 'JPEG @3x', 'SVG', 'PDF', 'Project JSON']) {
    expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
  }
});

it('closes the export menu with Escape', async () => {
  const user = userEvent.setup();
  render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);
  await user.click(screen.getByRole('button', { name: 'Export' }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu', { name: 'Export formats' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx src/test/exportUtils.test.ts
```

Expected: FAIL because the native `details` control does not expose the specified button/menu semantics or Escape behavior.

- [ ] **Step 3: Replace native details state with a controlled popover**

Replace `exportRef` with a wrapper ref and state:

```tsx
const [exportOpen, setExportOpen] = useState(false);
const exportRef = useRef<HTMLDivElement>(null);
```

Extend the existing effect to close on `Escape` and outside pointer interaction:

```tsx
useEffect(() => {
  if (!exportOpen) return;
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setExportOpen(false);
  };
  const closeOnOutsidePointer = (event: PointerEvent) => {
    if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
  };
  window.addEventListener('keydown', closeOnEscape);
  window.addEventListener('pointerdown', closeOnOutsidePointer);
  return () => {
    window.removeEventListener('keydown', closeOnEscape);
    window.removeEventListener('pointerdown', closeOnOutsidePointer);
  };
}, [exportOpen]);
```

Update `runExport` to use `try/finally`:

```tsx
function runExport(action: () => void) {
  try {
    action();
  } finally {
    setExportOpen(false);
  }
}
```

Render a labeled button and menu:

```tsx
<div ref={exportRef} className="relative">
  <button
    aria-label="Export"
    aria-expanded={exportOpen}
    aria-haspopup="menu"
    aria-controls="export-formats-menu"
    className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-xs font-medium"
    onClick={() => setExportOpen((open) => !open)}
  >
    <Download size={14} /> Export <ChevronDown size={12} />
  </button>
  {exportOpen && (
    <div id="export-formats-menu" role="menu" aria-label="Export formats">
      {exportItems.map(({ label, action }) => (
        <button key={label} role="menuitem" onClick={() => runExport(action)}>
          {label}
        </button>
      ))}
    </div>
  )}
</div>
```

Rename item labels to `Transparent PNG` and `Project JSON`; keep their existing actions.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/test/toolbar-layout.test.tsx src/test/exportUtils.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.tsx src/test/toolbar-layout.test.tsx src/test/exportUtils.test.ts
git commit -m "feat: add accessible export format menu"
```

---

### Task 4: Full Verification and Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed Text, Shapes, and Export behavior.
- Produces: accurate user-facing feature documentation and verified production build.

- [ ] **Step 1: Update README wording**

Document text alignment and multiline editing, list the categorized geometry tools, and use the exact export labels:

```markdown
- **Text controls** — font family, size, bold, italic, left/center/right alignment, and inline multiline editing (`Shift+Enter`)
- **Shapes dropdown** — Rectangle, Circle/Ellipse, Triangle, Diamond, Pentagon, Hexagon, Octagon, and Star
```

Update the Export table rows to `Transparent PNG` and `Project JSON`.

- [ ] **Step 2: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended Text, Shapes, Export, test, and README files are modified.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe text shapes and export controls"
```
