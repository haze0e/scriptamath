export interface SampleAssignment {
  id: string;
  title: string;
  description: string;
  content: string;
}

export const SAMPLE_ASSIGNMENTS: SampleAssignment[] = [
  {
    id: 'laplace-transforms-assignment',
    title: "Laplace Transforms & IVP Differential Equations",
    description: "Laplace transforms, partial fractions, Dirac delta function, boundary value problems, and piecewise cases.",
    content: `# Laplace Transforms & Differential Equations
Candidate: Chitesh (Roll No. 25323015)

**1.**
Given: $y'' + 3y' + 2y = e^{-t},\\quad y(0)=0,\\; y'(0)=0$

Taking Laplace Transform:

$$(s^2 + 3s + 2)Y(s) = \\frac{1}{s+1}$$

$$Y(s) = \\frac{1}{(s+1)^2(s+2)}$$

Partial fractions:

$$\\frac{1}{(s+1)^2(s+2)} = \\frac{A}{s+1} + \\frac{B}{(s+1)^2} + \\frac{C}{s+2}$$

* $C = \\left.\\frac{1}{(s+1)^2}\\right\\vert{}_{s=-2} = 1$
* $B = \\left.\\frac{1}{s+2}\\right\\vert{}_{s=-1} = 1$
* At $s=0$: $\\frac{1}{2} = A + 1 + \\frac{1}{2} \\implies A = -1$

$$Y(s) = -\\frac{1}{s+1} + \\frac{1}{(s+1)^2} + \\frac{1}{s+2}$$

Taking inverse Laplace:

$$y(t) = -e^{-t} + te^{-t} + e^{-2t} = (t-1)e^{-t} + e^{-2t}$$

---

**2.**
Given: $y'' + y = \\delta(t-a),\\quad y(0)=0,\\; y(b)=0,\\quad 0 < a < b$

Let $y'(0) = c_1$.
Taking Laplace Transform:

$$(s^2 + 1)Y(s) - c_1 = e^{-as} \\implies Y(s) = \\frac{c_1}{s^2+1} + \\frac{e^{-as}}{s^2+1}$$

Taking inverse Laplace:

$$y(t) = c_1 \\sin t + \\sin(t-a) u(t-a)$$

Using boundary condition $y(b) = 0$ (since $b > a$):

$$c_1 \\sin b + \\sin(b-a) = 0 \\implies c_1 = -\\frac{\\sin(b-a)}{\\sin b}$$

Hence:

* For $t \\in [0, a]$:

$$y(t) = -\\frac{\\sin(b-a)}{\\sin b}\\sin t$$

* For $t \\in [a, b]$:

$$y(t) = -\\frac{\\sin(b-a)}{\\sin b}\\sin t + \\sin(t-a) = \\frac{\\sin(t-a)\\sin b - \\sin(b-a)\\sin t}{\\sin b} = -\\frac{\\sin a \\sin(b-t)}{\\sin b}$$

$$y(t) = \\begin{cases} -\\frac{\\sin(b-a)}{\\sin b}\\sin t, & t \\in [0, a] \\\\ -\\frac{\\sin a \\sin(b-t)}{\\sin b}, & t \\in [a, b] \\end{cases}$$

---

**3.**
Given: $y''' + 2y'' - y' - 2y = 0,\\quad y(0)=0,\\; y'(0)=0,\\; y''(0)=6$

Taking Laplace Transform:


$$(s^3 + 2s^2 - s - 2)Y(s) - y''(0) = 0$$

$$(s^2(s+2) - (s+2))Y(s) = 6 \\implies (s-1)(s+1)(s+2)Y(s) = 6$$

$$Y(s) = \\frac{6}{(s-1)(s+1)(s+2)}$$

Partial fractions:


$$Y(s) = \\frac{A}{s-1} + \\frac{B}{s+1} + \\frac{C}{s+2}$$

* $A = \\frac{6}{(2)(3)} = 1$
* $B = \\frac{6}{(-2)(1)} = -3$
* $C = \\frac{6}{(-3)(-1)} = 2$

$$Y(s) = \\frac{1}{s-1} - \\frac{3}{s+1} + \\frac{2}{s+2}$$


Taking inverse Laplace:


$$y(t) = e^t - 3e^{-t} + 2e^{-2t}$$

---

**4.**
Given: $y^{iv} - y = 1,\\quad y(0)=y'(0)=y''(0)=y'''(0)=0$

Taking Laplace Transform:


$$(s^4 - 1)Y(s) = \\frac{1}{s} \\implies Y(s) = \\frac{1}{s(s^4-1)} = \\frac{1}{s(s^2-1)(s^2+1)}$$

Partial fractions:


$$\\frac{1}{s(s^2-1)(s^2+1)} = -\\frac{1}{s} + \\frac{1}{2}\\frac{s}{s^2-1} + \\frac{1}{2}\\frac{s}{s^2+1}$$

Taking inverse Laplace:


$$y(t) = -1 + \\frac{1}{2}\\cosh t + \\frac{1}{2}\\cos t = -1 + \\frac{1}{2}(\\cosh t + \\cos t)$$

---

**5.**
Given: $y'' + y = f(t),\\quad y(0)=0,\\; y'(0)=0$, where $f(t) = \\begin{cases} 0, & t \\in [0,\\pi) \\\\ \\sin t, & t \\in [\\pi, 2\\pi) \\end{cases},\\quad f(t+2\\pi) = f(t)$

In the base period $[0, 2\\pi)$:


$$f(t) = \\sin t [u(t-\\pi) - u(t-2\\pi)] = -\\sin(t-\\pi)u(t-\\pi) - \\sin(t-2\\pi)u(t-2\\pi)$$

Taking Laplace Transform:


$$(s^2+1)Y(s) = F(s)$$


For a single impulse response:


$$\\mathcal{L}^{-1}\\left\\{\\frac{1}{(s^2+1)^2}\\right\\} = \\frac{1}{2}(\\sin t - t\\cos t) = g(t)$$

Since $g(-t) = -g(t)$ (odd function), $-g(t-2\\pi) = g(2\\pi-t)$:


$$y(t) = g(t-\\pi)u_\\pi(t) - g(2\\pi-t)u_{2\\pi}(t),\\quad \\text{where } g(t) = \\frac{1}{2}(\\sin t - t\\cos t)$$

---

**6.**
Given: $y'' + 4y' + 5y = f(t),\\quad y(0)=0,\\; y'(0)=0$, where $f(t) = \\begin{cases} 1, & t \\in [0, \\pi) \\\\ -1, & t \\in [\\pi, 2\\pi) \\end{cases},\\quad f(t+2\\pi) = f(t)$

In terms of unit step functions:


$$f(t) = 1 - 2u(t-\\pi) + u(t-2\\pi)$$

Taking Laplace Transform:


$$(s^2 + 4s + 5)Y(s) = \\frac{1}{s} - \\frac{2e^{-\\pi s}}{s} + \\frac{e^{-2\\pi s}}{s}$$

$$Y(s) = G(s)[1 - 2e^{-\\pi s} + e^{-2\\pi s}],\\quad \\text{where } G(s) = \\frac{1}{s((s+2)^2+1)}$$

Resolving $G(s)$ into partial fractions:


$$G(s) = \\frac{1}{5}\\left[\\frac{1}{s} - \\frac{s+4}{(s+2)^2+1}\\right] = \\frac{1}{5}\\left[\\frac{1}{s} - \\frac{s+2}{(s+2)^2+1} - 2\\frac{1}{(s+2)^2+1}\\right]$$

$$g(t) = \\mathcal{L}^{-1}\\{G(s)\\} = \\frac{1}{5}[1 - e^{-2t}(\\cos t + 2\\sin t)]$$

By second shifting theorem:


$$y(t) = u_0(t)g(t) - 2u_\\pi(t)g(t-\\pi) + u_{2\\pi}(t)g(t-2\\pi)$$

---

**7.**
Given: $y'' + n^2 y = a\\sin(nt+\\alpha),\\quad y(0)=0,\\; y'(0)=0$

$$\\sin(nt+\\alpha) = \\sin nt \\cos\\alpha + \\cos nt \\sin\\alpha$$


Taking Laplace Transform:


$$(s^2+n^2)Y(s) = a\\left[\\cos\\alpha \\frac{n}{s^2+n^2} + \\sin\\alpha \\frac{s}{s^2+n^2}\\right]$$

$$Y(s) = a\\cos\\alpha \\frac{n}{(s^2+n^2)^2} + a\\sin\\alpha \\frac{s}{(s^2+n^2)^2}$$

Standard inverse transforms:

* $\\mathcal{L}^{-1}\\left\\{\\frac{n}{(s^2+n^2)^2}\\right\\} = \\frac{1}{2n^2}(\\sin nt - nt\\cos nt)$
* $\\mathcal{L}^{-1}\\left\\{\\frac{s}{(s^2+n^2)^2}\\right\\} = \\frac{t}{2n}\\sin nt$

$$y(t) = \\frac{a\\cos\\alpha}{2n^2}(\\sin nt - nt\\cos nt) + \\frac{a\\sin\\alpha}{2n^2}(nt\\sin nt)$$

$$y(t) = \\frac{a}{2n^2}\\left[\\sin nt\\cos\\alpha - nt(\\cos nt\\cos\\alpha - \\sin nt\\sin\\alpha)\\right]$$

$$y(t) = \\frac{a}{2n^2}\\{\\sin nt\\cos\\alpha - nt\\cos(nt+\\alpha)\\}$$

---

**8.**
Given: $t y'' + 2y' + t y = \\cos t,\\quad y(0)=1,\\; y'(0)=0$

Taking Laplace Transform:


$$-\\frac{d}{ds}[s^2 Y - s(1) - 0] + 2[sY - 1] - \\frac{d}{ds}Y = \\frac{s}{s^2+1}$$

$$-(s^2 Y' + 2sY - 1) + 2sY - 2 - Y' = \\frac{s}{s^2+1}$$

$$-(s^2+1)Y' - 1 = \\frac{s}{s^2+1}$$

$$-(s^2+1)Y' = 1 + \\frac{s}{s^2+1} = \\frac{s^2+s+1}{s^2+1}$$

$$-Y' = \\frac{s^2+1+s}{(s^2+1)^2} = \\frac{1}{s^2+1} + \\frac{s}{(s^2+1)^2}$$

Since $\\mathcal{L}\\{t y(t)\\} = -Y'(s)$:


$$t y(t) = \\sin t + \\frac{1}{2}t\\sin t = \\left(1 + \\frac{t}{2}\\right)\\sin t$$

$$y(t) = \\frac{1}{2}\\left(1 + \\frac{2}{t}\\right)\\sin t$$

---

**9.**
Given: $t y'' + 4t y' + 4y = 8,\\quad y(0)=2,\\; y'(0)=c$

Taking Laplace Transform:


$$-\\frac{d}{ds}[s^2 Y - 2s - c] - 4\\frac{d}{ds}[sY - 2] + 4Y = \\frac{8}{s}$$

$$-(s^2 Y' + 2sY - 2) - 4(sY' + Y) + 4Y = \\frac{8}{s}$$

$$-(s^2+4s)Y' - 2sY + 2 = \\frac{8}{s}$$

$$(s^2+4s)Y' + 2sY = 2 - \\frac{8}{s} = \\frac{2(s-4)}{s}$$

$$Y' + \\frac{2}{s+4}Y = \\frac{2(s-4)}{s^2(s+4)}$$

Integrating Factor:


$$\\text{I.F.} = e^{\\int \\frac{2}{s+4}ds} = (s+4)^2$$

$$\\frac{d}{ds}[(s+4)^2 Y] = \\frac{2(s-4)(s+4)}{s^2} = 2 - \\frac{32}{s^2}$$

$$(s+4)^2 Y = 2s + \\frac{32}{s} + C_1$$

$$Y(s) = \\frac{2s^2 + C_1 s + 32}{s(s+4)^2} = \\frac{2}{s} + \\frac{C_1 - 16}{(s+4)^2}$$

Taking inverse Laplace:


$$y(t) = 2 + (C_1-16)te^{-4t}$$


Since $y'(0) = C_1 - 16 = c$:


$$y(t) = 2 + c t e^{-4t}$$

---

**10.**
Given: $y'' + 2y' + 5y = e^{-t}\\sin t,\\quad y(0)=0,\\; y'(0)=1$

Taking Laplace Transform:


$$(s^2+2s+5)Y(s) - 1 = \\frac{1}{(s+1)^2+1} = \\frac{1}{s^2+2s+2}$$

$$(s^2+2s+5)Y(s) = 1 + \\frac{1}{s^2+2s+2} = \\frac{s^2+2s+3}{s^2+2s+2}$$

$$Y(s) = \\frac{s^2+2s+3}{(s^2+2s+5)(s^2+2s+2)}$$

Let $u = s^2+2s$:


$$\\frac{u+3}{(u+5)(u+2)} = \\frac{2/3}{u+5} + \\frac{1/3}{u+2}$$

$$Y(s) = \\frac{2}{3}\\frac{1}{(s+1)^2+4} + \\frac{1}{3}\\frac{1}{(s+1)^2+1} = \\frac{1}{3}\\frac{2}{(s+1)^2+2^2} + \\frac{1}{3}\\frac{1}{(s+1)^2+1^2}$$

Taking inverse Laplace:


$$y(t) = \\frac{1}{3}e^{-t}\\sin 2t + \\frac{1}{3}e^{-t}\\sin t = \\frac{1}{3}e^{-t}(\\sin t + \\sin 2t)$$

---

**11.**
Given: $f(t) = t + 6\\int_0^t f(\\tau)e^{t-\\tau}d\\tau$

Convolution form: $f(t) = t + 6(f(t)*e^t)$.
Taking Laplace Transform:


$$F(s) = \\frac{1}{s^2} + 6F(s)\\frac{1}{s-1}$$

$$F(s)\\left[1 - \\frac{6}{s-1}\\right] = \\frac{1}{s^2} \\implies F(s)\\left[\\frac{s-7}{s-1}\\right] = \\frac{1}{s^2}$$

$$F(s) = \\frac{s-1}{s^2(s-7)}$$

Partial fractions:


$$\\frac{s-1}{s^2(s-7)} = \\frac{A}{s} + \\frac{B}{s^2} + \\frac{C}{s-7}$$

* $C = \\left.\\frac{s-1}{s^2}\\right\\vert{}_{s=7} = \\frac{6}{49}$
* $B = \\left.\\frac{s-1}{s-7}\\right\\vert{}_{s=0} = \\frac{1}{7} = \\frac{7}{49}$
* $s \\to \\infty: 0 = A + C \\implies A = -\\frac{6}{49}$

$$F(s) = -\\frac{6}{49}\\frac{1}{s} + \\frac{7}{49}\\frac{1}{s^2} + \\frac{6}{49}\\frac{1}{s-7}$$


Taking inverse Laplace:


$$f(t) = \\frac{-6 + 7t + 6e^{7t}}{49}$$

---

**12.**
Given: $f(t) = 1 + t + 2\\int_0^t \\sin\\tau f(t-\\tau)d\\tau$

Convolution form: $f(t) = 1 + t + 2(\\sin t * f(t))$.
Taking Laplace Transform:


$$F(s) = \\frac{1}{s} + \\frac{1}{s^2} + 2\\frac{1}{s^2+1}F(s)$$

$$F(s)\\left[\\frac{s^2-1}{s^2+1}\\right] = \\frac{s+1}{s^2}$$

$$F(s) = \\frac{(s+1)(s^2+1)}{s^2(s-1)(s+1)} = \\frac{s^2+1}{s^2(s-1)}$$

Partial fractions:


$$\\frac{s^2+1}{s^2(s-1)} = \\frac{A}{s} + \\frac{B}{s^2} + \\frac{C}{s-1}$$

* $C = \\left.\\frac{s^2+1}{s^2}\\right\\vert{}_{s=1} = 2$
* $B = \\left.\\frac{s^2+1}{s-1}\\right\\vert{}_{s=0} = -1$
* $s \\to \\infty: 1 = A + C \\implies A = 1 - 2 = -1$

$$F(s) = -\\frac{1}{s} - \\frac{1}{s^2} + \\frac{2}{s-1}$$


Taking inverse Laplace:


$$f(t) = -1 - t + 2e^t = 2e^t - t - 1$$

---

**13.**
Given: $y^{iv} = \\frac{W}{EI}\\delta(x - l/4)$, with $y(0)=0,\\; y''(0)=0,\\; y(l)=0,\\; y'(l)=0$.

Let $y'(0) = c_1$, $y'''(0) = c_3$.
Taking Laplace Transform with respect to $x$:


$$s^4 Y(s) - c_1 s^2 - c_3 = \\frac{W}{EI}e^{-ls/4}$$

$$Y(s) = \\frac{c_1}{s^2} + \\frac{c_3}{s^4} + \\frac{W}{EI}\\frac{e^{-ls/4}}{s^4}$$

Taking inverse Laplace:


$$y(x) = c_1 x + \\frac{c_3}{6}x^3 + \\frac{W}{6EI}\\left(x - \\frac{l}{4}\\right)^3 u\\left(x - \\frac{l}{4}\\right)$$

$$y'(x) = c_1 + \\frac{c_3}{2}x^2 + \\frac{W}{2EI}\\left(x - \\frac{l}{4}\\right)^2 u\\left(x - \\frac{l}{4}\\right)$$

Applying boundary conditions at $x = l$:

1. $y(l) = c_1 l + \\frac{c_3}{6}l^3 + \\frac{W}{6EI}\\left(\\frac{3l}{4}\\right)^3 = 0 \\implies c_1 + \\frac{c_3}{6}l^2 + \\frac{9Wl^2}{128EI} = 0$
2. $y'(l) = c_1 + \\frac{c_3}{2}l^2 + \\frac{W}{2EI}\\left(\\frac{3l}{4}\\right)^2 = 0 \\implies c_1 + \\frac{c_3}{2}l^2 + \\frac{9Wl^2}{32EI} = 0$

Subtracting:


$$\\frac{c_3}{3}l^2 + \\frac{27Wl^2}{128EI} = 0 \\implies \\frac{c_3}{6} = -\\frac{27W}{256EI}$$

$$c_1 = -\\frac{c_3}{6}l^2 - \\frac{9Wl^2}{128EI} = \\frac{27Wl^2}{256EI} - \\frac{18Wl^2}{256EI} = \\frac{9Wl^2}{256EI}$$

Hence:


$$y(x) = \\begin{cases} \\frac{9Wl^2 x}{256EI} - \\frac{27Wx^3}{256EI}, & x \\in (0, l/4] \\\\ \\frac{9Wl^2 x}{256EI} - \\frac{27Wx^3}{256EI} + \\frac{W}{6EI}\\left(x - \\frac{l}{4}\\right)^3, & x \\in (l/4, l) \\end{cases}$$

---

**14.**
Given: $y' + 2x = \\sin 2t$, $x' - 2y = \\cos 2t$, with $x(0)=1,\\; y(0)=0$.

Taking Laplace Transform:

1. $sY(s) - 0 + 2X(s) = \\frac{2}{s^2+4} \\implies 2X(s) + sY(s) = \\frac{2}{s^2+4}$
2. $sX(s) - 1 - 2Y(s) = \\frac{s}{s^2+4} \\implies sX(s) - 2Y(s) = \\frac{s^2+s+4}{s^2+4}$

Eliminating $Y(s)$ (multiply (1) by $2$, (2) by $s$, and add):


$$(s^2+4)X(s) = \\frac{4 + s(s^2+s+4)}{s^2+4} = \\frac{s^3+s^2+4s+4}{s^2+4} = \\frac{(s^2+4)(s+1)}{s^2+4} = s+1$$

$$X(s) = \\frac{s+1}{s^2+4} = \\frac{s}{s^2+4} + \\frac{1}{2}\\frac{2}{s^2+4} \\implies x(t) = \\cos 2t + \\frac{1}{2}\\sin 2t$$

From (1):


$$sY(s) = \\frac{2}{s^2+4} - 2\\left(\\frac{s+1}{s^2+4}\\right) = \\frac{-2s}{s^2+4} \\implies Y(s) = -\\frac{2}{s^2+4}$$

$$y(t) = -\\sin 2t$$

Now evaluating $4x^2 + 4xy + 5y^2$:


$$4x^2 = 4\\left(\\cos 2t + \\frac{1}{2}\\sin 2t\\right)^2 = 4\\cos^2 2t + 4\\sin 2t\\cos 2t + \\sin^2 2t$$

$$4xy = 4\\left(\\cos 2t + \\frac{1}{2}\\sin 2t\\right)(-\\sin 2t) = -4\\sin 2t\\cos 2t - 2\\sin^2 2t$$

$$5y^2 = 5(-\\sin 2t)^2 = 5\\sin^2 2t$$

Adding all three:


$$4x^2 + 4xy + 5y^2 = 4\\cos^2 2t + (4-4)\\sin 2t\\cos 2t + (1 - 2 + 5)\\sin^2 2t$$

$$= 4\\cos^2 2t + 4\\sin^2 2t = 4(\\cos^2 2t + \\sin^2 2t) = 4$$

Hence, the particle moves along the curve $4x^2 + 4xy + 5y^2 = 4$.
`,
  },
  {
    id: 'z-transforms-binomial-assignment',
    title: 'Z-Transforms & Trigonometric Sequences (Binomial & Greek)',
    description: 'Z-transforms, binomial coefficients \\binom{n+r}{r}, trigonometric damping cos(n\\theta), sin(n\\theta), and series expansions.',
    content: `# Z-Transforms & Discrete Systems Assignment
Candidate: Chitesh (Roll No. 25323015)

**1.**
Given sequence: $y(n) = \\binom{n+r}{r} a^n u(n)$

Taking Z-transform on both sides:

$$X(z) = \\sum_{n=0}^{\\infty} \\binom{n+r}{r} a^n z^{-n} = \\sum_{n=0}^{\\infty} \\binom{n+r}{r} (az^{-1})^n$$

Using negative binomial series expansion:

$$X(z) = \\frac{1}{(1 - az^{-1})^{r+1}},\\quad \\text{for } |z| > |a|$$

---

**2.**
Trigonometric Sequences with Greek parameter $\\theta$:

Given: $x(n) = a^n \\cos(n\\theta) u(n)$ and $y(n) = a^n \\sin(n\\theta) u(n)$, with $\\theta \\in [0, 2\\pi]$

Using Euler's identity: $e^{in\\theta} = \\cos(n\\theta) + i\\sin(n\\theta)$

Taking Z-transform:

$$\\mathcal{Z}\\{a^n e^{in\\theta}\\} = \\frac{1}{1 - a e^{in\\theta} z^{-1}} = \\frac{z}{z - a e^{in\\theta}}$$

Multiplying numerator and denominator by $(z - a e^{-in\\theta})$:

$$\\frac{z(z - a e^{-in\\theta})}{(z - a e^{in\\theta})(z - a e^{-in\\theta})} = \\frac{z^2 - az\\cos\\theta + i az\\sin\\theta}{z^2 - 2az\\cos\\theta + a^2}$$

Equating real and imaginary parts:

$$\\mathcal{Z}\\{a^n \\cos(n\\theta)\\} = \\frac{z^2 - az\\cos\\theta}{z^2 - 2az\\cos\\theta + a^2}$$

$$\\mathcal{Z}\\{a^n \\sin(n\\theta)\\} = \\frac{az\\sin\\theta}{z^2 - 2az\\cos\\theta + a^2}$$

where the series converges as $n = 0, 1, 2, \\dots, \\infty$.
`,
  },
  {
    id: 'chitesh-pde-assignment',
    title: "Chitesh's Notes: First-Order PDE & Tangent Planes",
    description: "From Chitesh's actual scanned notes: PDE arbitrary constant elimination (z = ax + by + ab), partial derivatives, and plane equations.",
    content: `# Partial Differential Equations — Assignment 4
## Department of Mathematics & Computational Engineering

Candidate: Chitesh (Roll No. 25323015)

Question 1.
(a) Form the partial differential equation by eliminating arbitrary constants from:
$$z = ax + by + ab$$

Differentiating partially with respect to $x$ and $y$:
$$\\frac{\\partial z}{\\partial x} = a, \\quad \\frac{\\partial z}{\\partial y} = b$$

Substituting $p = \\frac{\\partial z}{\\partial x}$ and $q = \\frac{\\partial z}{\\partial y}$ back into the relation:
$$z = px + qy + pq$$
$$\\boxed{z = px + qy + pq}$$

(b) Form the PDE by eliminating arbitrary constants from:
$$z = a e^y + \\frac{1}{2} a^2 e^{2y} (2x)$$

Differentiating with respect to $y$:
$$q = \\frac{\\partial z}{\\partial y} = a e^y + a^2 e^{2y} (x) \\implies q = (x)(a e^y) + (a e^y)^2$$

Since $p = \\frac{\\partial z}{\\partial x} = a e^y$, substituting $p$:
$$\\boxed{q = xp + p^2}$$

---

Question 2. Find the equation of the plane not parallel to $z$-axis:
$$Ax + By - z + C = 0$$

The perpendicular distance from origin is:
$$d = \\frac{|C|}{\\sqrt{A^2 + B^2 + 1}} = a \\implies C = a \\sqrt{1 + A^2 + B^2}$$

Substituting arbitrary constant $C$ back:
$$\\boxed{z = Ax + By + a \\sqrt{1 + A^2 + B^2}}$$
`,
  },
  {
    id: 'laplace-ode',
    title: 'Engineering Math: Damped Harmonic Oscillator (Laplace ODE)',
    description: 'Second-order differential equation with initial conditions, partial fraction expansion, and boxed final solution.',
    content: `# Problem Set 3: Engineering Mathematics
## Department of Mechanical & Aerospace Engineering

Q1. Consider the damped harmonic oscillator governed by:
$$\\frac{d^2 x}{dt^2} + 4\\frac{dx}{dt} + 13x = 10 e^{-2t}$$
Subject to initial conditions $x(0) = 0$ and $\\frac{dx}{dt}(0) = 3$. Determine the closed-form response $x(t)$.

Ans:
Applying the Laplace Transform $\\mathcal{L}\\{x(t)\\} = X(s)$ with initial conditions:
$$[s^2 X(s) - sx(0) - x'(0)] + 4[s X(s) - x(0)] + 13 X(s) = \\frac{10}{s + 2}$$
$$\\implies (s^2 + 4s + 13) X(s) - 3 = \\frac{10}{s + 2}$$
$$\\implies (s^2 + 4s + 13) X(s) = 3 + \\frac{10}{s + 2} = \\frac{3s + 16}{s + 2}$$
$$\\implies X(s) = \\frac{3s + 16}{(s + 2)(s^2 + 4s + 13)}$$

Performing partial fraction decomposition:
$$X(s) = \\frac{A}{s + 2} + \\frac{Bs + C}{(s + 2)^2 + 9}$$
$$A(s^2 + 4s + 13) + (Bs + C)(s + 2) = 3s + 16$$
Setting $s = -2$:
$$A(4 - 8 + 13) = -6 + 16 \\implies 9A = 10 \\implies A = \\frac{10}{9}$$

Taking the inverse Laplace Transform:
$$x(t) = \\frac{10}{9} e^{-2t} + e^{-2t} \\left( -\\frac{10}{9} \\cos(3t) + \\frac{17}{9} \\sin(3t) \\right)$$
$$\\boxed{x(t) = e^{-2t} \\left[ \\frac{10}{9} - \\frac{10}{9}\\cos(3t) + \\frac{17}{9}\\sin(3t) \\right]}$$
`
  },
  {
    id: 'electrodynamics',
    title: 'Electrodynamics & Maxwell Equations Derivation',
    description: 'Electromagnetic wave equation in vacuum derived from Maxwell equations with vector curl identities.',
    content: `# PHY 301: Classical Electrodynamics
## Assignment 4: Wave Propagation in Vacuum

Q2. Derive the electromagnetic wave equation for the electric field $\\vec{E}$ in a charge-free, source-free vacuum from Maxwell's Equations.

Ans:
In free space (charge density $\\rho = 0$ and current density $\\vec{J} = 0$), Maxwell's equations simplify to:
1. $\\nabla \\cdot \\vec{E} = 0$
2. $\\nabla \\cdot \\vec{B} = 0$
3. $\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}$
4. $\\nabla \\times \\vec{B} = \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}$

Taking the curl of Faraday's Law (Equation 3):
$$\\nabla \\times (\\nabla \\times \\vec{E}) = -\\frac{\\partial}{\\partial t} (\\nabla \\times \\vec{B})$$

Using the vector calculus identity $\\nabla \\times (\\nabla \\times \\vec{E}) = \\nabla(\\nabla \\cdot \\vec{E}) - \\nabla^2 \\vec{E}$:
$$\\implies \\nabla(0) - \\nabla^2 \\vec{E} = -\\frac{\\partial}{\\partial t} \\left( \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t} \\right)$$
$$\\implies -\\nabla^2 \\vec{E} = -\\mu_0 \\epsilon_0 \\frac{\\partial^2 \\vec{E}}{\\partial t^2}$$
$$\\therefore \\nabla^2 \\vec{E} - \\frac{1}{c^2} \\frac{\\partial^2 \\vec{E}}{\\partial t^2} = 0$$

Where the speed of light in vacuum is defined by:
$$\\boxed{c = \\frac{1}{\\sqrt{\\mu_0 \\epsilon_0}} \\approx 3 \\times 10^8 \\text{ m/s}}$$
`
  },
  {
    id: 'quantum-well',
    title: 'Quantum Mechanics: 1D Infinite Potential Well',
    description: 'Time-independent Schrödinger equation, boundary value problem, and normalized energy eigenkets.',
    content: `# Quantum Physics: Problem Set 2
## Particle Confined in a 1D Box

Q3. A particle of mass $m$ is trapped in a 1D infinite square well with potential $V(x) = 0$ for $0 \\le x \\le L$ and $V(x) = \\infty$ elsewhere. Find the stationary wavefunctions $\\psi_n(x)$ and energy eigenvalues $E_n$.

Ans:
Inside the well ($0 \\le x \\le L$), the time-independent Schrödinger equation is:
$$-\\frac{\\hbar^2}{2m} \\frac{d^2 \\psi}{dx^2} = E \\psi$$
$$\\implies \\frac{d^2 \\psi}{dx^2} + k^2 \\psi = 0, \\quad k = \\sqrt{\\frac{2mE}{\\hbar^2}}$$

The general solution is:
$$\\psi(x) = A \\sin(kx) + B \\cos(kx)$$

Applying boundary condition at $x = 0$:
$$\\psi(0) = B = 0 \\implies \\psi(x) = A \\sin(kx)$$

Applying boundary condition at $x = L$:
$$\\psi(L) = A \\sin(kL) = 0 \\implies kL = n\\pi, \\quad n = 1, 2, 3, \\dots$$
$$\\therefore k_n = \\frac{n\\pi}{L}$$

Normalizing the wavefunction $\\int_0^L |\\psi(x)|^2 dx = 1$:
$$A^2 \\int_0^L \\sin^2\\left(\\frac{n\\pi x}{L}\\right) dx = A^2 \\frac{L}{2} = 1 \\implies A = \\sqrt{\\frac{2}{L}}$$

Thus the quantized energy levels are:
$$\\boxed{E_n = \\frac{n^2 \\pi^2 \\hbar^2}{2m L^2}}$$
`
  },
  {
    id: 'difference-table',
    title: 'Numerical Analysis: Gauss Forward Difference Table (y = e^x)',
    description: 'Finite difference table with clean aligned handwritten columns without separation lines, Gauss interpolation formula, and derivative calculation.',
    content: `# Numerical Analysis & Computational Methods
## Department of Mathematics & Scientific Computing

Question 6. Construct the finite difference table for $y = e^x$ with $h = 0.1$ and estimate the derivative $y'(1.38)$ using Gauss's Forward Interpolation Formula.

**Difference Table ($h = 0.1$):**

| $x$ | $y = e^x$ | $\\Delta y$ | $\\Delta^2 y$ | $\\Delta^3 y$ | $\\Delta^4 y$ |
|---|---|---|---|---|---|
| $1.2$ | $3.320$ | | | | |
| | $0.349$ | | | |
| $1.3$ | $3.669$ | | $0.037$ | | |
| | $0.386$ | | $0.004$ | |
| $1.4$ | $4.055$ | | $0.041$ | | $-0.001$ |
| | $0.427$ | | $0.003$ | |
| $1.5$ | $4.482$ | | $0.044$ | | |
| | $0.471$ | | | |
| $1.6$ | $4.953$ | | | | |

#### 1. Estimate $y'(1.38)$ using Gauss's Forward Formula:

Taking $x_0 = 1.4$, we have:
$$p = \\frac{x - x_0}{h} = \\frac{1.38 - 1.4}{0.1} = -0.2$$

Gauss's forward interpolation formula is:
$$y(p) = y_0 + p \\Delta y_0 + \\frac{p(p-1)}{2} \\Delta^2 y_{-1} + \\frac{(p+1)p(p-1)}{6} \\Delta^3 y_{-1} + \\frac{(p+1)p(p-1)(p-2)}{24} \\Delta^4 y_{-2}$$

Substituting finite differences:
$$y'(1.38) = \\frac{1}{0.1} \\left[ 0.427 - \\frac{1}{2}(0.041) + \\frac{1}{3}(0.003) - \\frac{1}{4}(-0.001) \\right]$$

$$\\boxed{y'(1.38) \\approx 3.9749}$$
`
  },
  {
    id: 'linear-algebra',
    title: 'Linear Algebra: Matrix Diagonalization & Characteristic Polynomial',
    description: 'Eigenvalues and eigenvectors of a 2x2 matrix with 2D grid brackets and determinant expansion.',
    content: `# Math 204: Linear Algebra & Matrix Theory
## Assignment 5: Spectral Decomposition

Q1. Consider the linear transformation matrix $A \\in \\mathbb{R}^{2 \\times 2}$:
$$A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$$
Find the eigenvalues $\\lambda_1, \\lambda_2$ and the diagonalizing modal matrix $P$.

Ans:
The characteristic equation is defined by the determinant:
$$\\det(A - \\lambda I) = 0$$
$$\\begin{vmatrix} 4 - \\lambda & 1 \\\\ 2 & 3 - \\lambda \\end{vmatrix} = 0$$

Expanding the determinant:
$$(4 - \\lambda)(3 - \\lambda) - 2(1) = 0$$
$$\\implies \\lambda^2 - 7\\lambda + 12 - 2 = 0$$
$$\\implies \\lambda^2 - 7\\lambda + 10 = 0$$
$$(\\lambda - 5)(\\lambda - 2) = 0$$
$$\\therefore \\lambda_1 = 5, \\quad \\lambda_2 = 2$$

For eigenvalue $\\lambda_1 = 5$:
$$(A - 5I)\\vec{v}_1 = \\begin{bmatrix} -1 & 1 \\\\ 2 & -2 \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$$
$$\\implies -x + y = 0 \\implies \\vec{v}_1 = \\begin{bmatrix} 1 \\\\ 1 \\end{bmatrix}$$

For eigenvalue $\\lambda_2 = 2$:
$$(A - 2I)\\vec{v}_2 = \\begin{bmatrix} 2 & 1 \\\\ 2 & 1 \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$$
$$\\implies 2x + y = 0 \\implies \\vec{v}_2 = \\begin{bmatrix} 1 \\\\ -2 \\end{bmatrix}$$

Thus the modal matrix $P$ and diagonal matrix $D$ are:
$$\\boxed{P = \\begin{bmatrix} 1 & 1 \\\\ 1 & -2 \\end{bmatrix}, \\quad D = \\begin{bmatrix} 5 & 0 \\\\ 0 & 2 \\end{bmatrix}}$$
\`
  },
  {
    id: 'bisection-root',
    title: 'Numerical Methods: Bisection Root Finding (Indian College Assignment)',
    description: 'Interval continuity check, sign changes, iterative bisection table, and boxed root.',
    content: \`# Numerical Analysis & Computation
## Department of Mathematics — Assignment 2

(1) Find the positive real root of the polynomial equation:
$$f(x) = 3x^2 + 5x - 40 = 0$$
Using the Bisection Method correct to 3 decimal places.

Ans:
Evaluating initial function bounds:
$$f(2) = 3(4) + 10 - 40 = -18 < 0$$
$$f(3) = 3(9) + 15 - 40 = +2 > 0$$
$$\\implies f(2) \\cdot f(3) < 0$$
Since $f(x)$ is continuous on $[2, 3]$, by Intermediate Value Theorem, a root lies in $(2, 3)$.

| $n$ | $a$ | $b$ | $x_n = \\frac{a+b}{2}$ | $f(x_n)$ |
|---|---|---|---|---|
| $1$ | $2.000$ | $3.000$ | $2.500$ | $-8.750$ |
| $2$ | $2.500$ | $3.000$ | $2.750$ | $-3.562$ |
| $3$ | $2.750$ | $3.000$ | $2.875$ | $-0.820$ |
| $4$ | $2.875$ | $3.000$ | $2.9375$ | $+0.578$ |
| $5$ | $2.875$ | $2.9375$ | $2.9062$ | $-0.124$ |
| $6$ | $2.9062$ | $2.9375$ | $2.9218$ | $+0.226$ |

$$\\boxed{\\text{Root } x \\approx 2.914}$$

---

(2)
(a) Evaluate negative root interval:
$$f(-4) = 3(16) - 20 - 40 = -12 < 0$$
$$f(-5) = 3(25) - 25 - 40 = +10 > 0$$
$$\\implies x \\in (-5, -4)$$
`
  },
  {
    id: 'laplace-properties',
    title: 'Advanced Calculus: Laplace Transform & Exponential Order',
    description: 'Improper integral definition, convergence limits, and exponential growth criteria.',
    content: `# Advanced Engineering Mathematics
## Assignment on Integral Transforms

(1)
(a) Determine whether the Laplace transform of $f(t) = e^{t^2}$ exists for any real $s$:
$$\\mathcal{L}\\{e^{t^2}\\} = \\int_0^\\infty e^{-st} e^{t^2} dt = \\int_0^\\infty e^{t^2 - st} dt$$

For any fixed real $s$, when $t > s + 1$:
$$t(t - s) > t \\implies e^{t^2 - st} > e^t$$
$$\\implies \\int_{s+1}^\\infty e^{t^2 - st} dt \\ge \\int_{s+1}^\\infty e^t dt = \\infty$$
Therefore, the integral diverges and $\\mathcal{L}\\{e^{t^2}\\}$ does not exist.

(b) Prove that $g(t) = \\cos(e^{t^2})$ takes values in $[-1, 1]$ on infinitely many points, but its derivative grows faster than any exponential order $M e^{ct}$:
$$\\frac{d}{dt} \\left( \\cos(e^{t^2}) \\right) = -2t e^{t^2} \\sin(e^{t^2})$$
$$\\boxed{\\text{Order: Non-exponential growth } \\implies \\text{Integral diverges}}$$
`
  }
];
