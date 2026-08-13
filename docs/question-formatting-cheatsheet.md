# Question Formatting Cheat-Sheet

A quick reference for adding questions with **math, formatting, and images** in the LOCOMOTIVE admin panel.

> **Golden rule:** never paste HTML. Everything below is safe, renders consistently on every device, and shows up correctly in tests. Use the **Preview** box under each field to check as you type.

---

## 1. The two math modes

All math goes between dollar signs. LaTeX inside is the same either way — only the size/placement changes.

| Use | Wrap with | When to use |
|-----|-----------|-------------|
| **Inline math** | `$ ... $` | Math *inside a sentence* or a short option, e.g. `The value $x^2$ is...` |
| **Display math** | `$$ ... $$` | A **big standalone equation** — large, centered, full-size fractions. Use this for the main expression in a question. |

**Example**
- Type: `Simplify $$\frac{a^2}{b}$$`
- Type in an option: `$\frac{7^5}{5^5}$`

---

## 2. Fractions

| Want | Type this |
|------|-----------|
| a fraction a/b | `$\frac{a}{b}$` |
| big centered fraction | `$$\frac{a}{b}$$` |
| fraction inside a fraction | `$\frac{\frac{1}{2}}{3}$` |

The **`a/b` button** in the toolbar inserts the fraction template for you.

---

## 3. Powers & exponents

| Want | Type this | Looks like |
|------|-----------|-----------|
| square | `$x^2$` | x² |
| any power | `$x^{10}$` | x¹⁰ (always use `{ }` for more than one character) |
| fractional power | `$32^{3/5}$` | 32^(3/5) |
| power of a power | `$(7^2)^{7/2}$` | |
| scientific notation | `$6.02 \times 10^{23}$` | 6.02 × 10²³ |

> **Important:** `x^10` shows as x¹0 (only the first character rises). Always wrap in braces: `x^{10}`.

---

## 4. Subscripts (and chemistry)

| Want | Type this | Looks like |
|------|-----------|-----------|
| subscript | `$x_1$` | x₁ |
| multi-char subscript | `$v_{max}$` | v_max |
| water | `$H_2O$` | H₂O |
| carbon dioxide | `$CO_2$` | CO₂ |
| ion charge | `$Na^+$` , `$SO_4^{2-}$` | Na⁺, SO₄²⁻ |

---

## 5. Roots

| Want | Type this | Looks like |
|------|-----------|-----------|
| square root | `$\sqrt{x}$` | √x |
| root of an expression | `$\sqrt{x^2 + 1}$` | |
| cube / nth root | `$\sqrt[3]{x}$` | ∛x |

The **√ button** in the toolbar inserts this.

---

## 6. Operators & symbols

| Symbol | Type this | | Symbol | Type this |
|--------|-----------|---|--------|-----------|
| × (times) | `\times` | | ± | `\pm` |
| · (dot) | `\cdot` | | ∓ | `\mp` |
| ÷ | `\div` | | ∞ | `\infty` |
| ≤ | `\leq` | | ≈ | `\approx` |
| ≥ | `\geq` | | ≠ | `\neq` |
| → | `\rightarrow` | | ° (degrees) | `^\circ` |
| ∑ | `\sum` | | ∫ | `\int` |

(All of these go **inside** `$ ... $`.)

---

## 7. Greek letters

Inside `$ ... $`: `\alpha` α, `\beta` β, `\gamma` γ, `\theta` θ, `\pi` π, `\mu` μ, `\lambda` λ, `\Delta` Δ, `\Omega` Ω, `\sigma` σ.

Capitalize the command for the capital letter: `\delta` δ vs `\Delta` Δ.

---

## 8. Parentheses that grow with the content

For tall expressions, use `\left(` and `\right)` so the brackets stretch:

```
$$\left( \frac{a}{b} \right)^2$$
```

---

## 9. Plain words inside math

Use `\text{...}` so words aren't italicised like variables:

```
$v = \frac{\text{distance}}{\text{time}}$
```

The **`</>` button** inserts `\text{ }`.

---

## 10. Text formatting (outside math)

| Want | Type this |
|------|-----------|
| **bold** | `**bold**` |
| *italic* | `*italic*` |
| superscript (non-math) | `^{sup}` → e.g. `1^{st}` |
| subscript (non-math) | `_{sub}` |

---

## 11. Images & diagrams

Click the **image button** in the toolbar to upload a diagram — it inserts the link for you. Or type it manually:

```
![description](https://url-to-image)
```

Use an image only when the content is genuinely a picture (a graph, a labelled diagram). For equations, always prefer math (`$...$`) — it's sharper, searchable, and scales on mobile.

---

## 12. Worked examples

**A. A big expression as the question stem** (from Math Test):

```
Simplify the given expression:

$$\frac{32^{3/5} \times 49^{7/2} \times 81^{6/4}}{25^{10/4} \times 64^{3/6} \times 9^3}$$
```

Its options:
```
Option A: $\frac{7^5}{5^5}$
Option B: $\frac{7^7}{5^7}$
Option C: $\frac{7^7}{5^5}$
Option D: $\frac{7^5 \times 2}{5^5}$
Option E: $\frac{7^7 \times 3^2}{5^5}$
```

**B. Polynomial division answer:**

```
Solve and choose the correct option:

$$\frac{x^3 - 5x^2 + 8x - 4}{x^2 - 3x + 2}$$
```
Option A: `$x - 2 + \frac{4}{x^2 - 3x + 2}$`

**C. Chemistry:**

```
Balance the reaction: $2H_2 + O_2 \rightarrow 2H_2O$
```

---

## 13. Tips

- **Always watch the Preview box** under the field — if the math looks wrong, the LaTeX has a typo (usually a missing `}` or `$`).
- Use `$$...$$` for the **main equation**, `$...$` for math **inside options and sentences**.
- Every `$` needs a closing `$`; every `{` needs a closing `}`.
- Don't paste HTML or Word equations — retype using the syntax above so it renders everywhere.

---

*Toolbar buttons: **∑** = inline math, **∑∑** = display math, **a/b** = fraction, **xⁿ** = exponent, **√** = root, **</>** = plain text in math, **image** = upload a diagram.*
