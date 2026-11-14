export interface SampleAssignment {
  id: string;
  title: string;
  description: string;
  content: string;
}

export const SAMPLE_ASSIGNMENTS: SampleAssignment[] = [
  {
  "id": "numerical-integration-assignment",
  "title": "Numerical Analysis: Numerical Integration & Quadrature",
  "description": "Composite Trapezoidal, Simpson 1/3, Simpson 3/8, error bounds, and Gauss-Legendre quadrature.",
  "content": "[METADATA]\nTitle: Numerical Analysis: Numerical Integration & Quadrature\nDate: 12/11/2026\n\n[MAIN_WORK]\n\n# Numerical Analysis: Numerical Integration & Quadrature\n\n## Question 1\n\nGiven step size $h = \\frac{b-a}{n}$, we use the standard composite quadrature rules:\n\n* **Trapezoidal Rule:** $I_T = \\frac{h}{2}\\left[(y_0 + y_n) + 2\\sum_{i=1}^{n-1} y_i\\right]$\n* **Simpson's $1/3$ Rule:** $I_{1/3} = \\frac{h}{3}\\left[(y_0 + y_n) + 4(y_1 + y_3 + \\dots) + 2(y_2 + y_4 + \\dots)\\right]$\n* **Simpson's $3/8$ Rule:** $I_{3/8} = \\frac{3h}{8}\\left[(y_0 + y_n) + 3(y_1 + y_2 + y_4 + y_5 + \\dots) + 2(y_3 + y_6 + \\dots)\\right]$\n\n---\n\n### (i) Evaluate $\\int_{0}^{1.2} \\ln(1+x^2)\\,dx$ with $n = 6$\n\nHere, $h = \\frac{1.2 - 0}{6} = 0.2$. Tabulating the values of $y_i = \\ln(1+x_i^2)$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.0$ | $0.2$ | $0.4$ | $0.6$ | $0.8$ | $1.0$ | $1.2$ |\n| $y_i$ | $0.000000$ | $0.039221$ | $0.148420$ | $0.307485$ | $0.494696$ | $0.693147$ | $0.891998$ |\n\n**(a) Using Trapezoidal Rule:**\n\n\n$$I_T = \\frac{0.2}{2}\\left[(0 + 0.891998) + 2(0.039221 + 0.148420 + 0.307485 + 0.494696 + 0.693147)\\right]$$\n\n$$I_T = 0.1(4.257936) = 0.425794$$\n\n**(b) Using Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{0.2}{3}\\left[0.891998 + 4(0.039221 + 0.307485 + 0.693147) + 2(0.148420 + 0.494696)\\right]$$\n\n$$I_{1/3} = \\frac{0.2}{3}(6.337642) = 0.422509$$\n\n**(c) Using Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{3(0.2)}{8}\\left[0.891998 + 3(0.039221 + 0.148420 + 0.494696 + 0.693147) + 2(0.307485)\\right]$$\n\n$$I_{3/8} = 0.075(5.633420) = 0.422507$$\n\n---\n\n### (ii) Evaluate $\\int_{0}^{1} \\cos(x^2)\\,dx$ with $n = 12$\n\nHere, $h = \\frac{1 - 0}{12} = \\frac{1}{12}$. Computing the function values $y_i = \\cos(x_i^2)$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0$ | $1/12$ | $2/12$ | $3/12$ | $4/12$ | $5/12$ | $6/12$ |\n| $y_i$ | $1.000000$ | $0.999976$ | $0.999614$ | $0.998048$ | $0.993834$ | $0.984967$ | $0.968912$ |\n\n| $i$ | $7$ | $8$ | $9$ | $10$ | $11$ | $12$ |\n| --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $7/12$ | $8/12$ | $9/12$ | $10/12$ | $11/12$ | $1$ |\n| $y_i$ | $0.942663$ | $0.902850$ | $0.845924$ | $0.768407$ | $0.667255$ | $0.540302$ |\n\nGrouping the sums first to make substitution easier:\n\n* $y_0 + y_{12} = 1.540302$\n* $\\sum y_{\\text{odd}} = 5.438833$, $\\quad \\sum y_{\\text{even}} = 4.633617$, $\\quad \\sum_{i=1}^{11} y_i = 10.072451$\n* $\\sum y_{3k} = y_3 + y_6 + y_9 = 2.812884$, $\\quad \\sum y_{\\text{non-}3k} = 7.259566$\n\n**(a) Trapezoidal Rule:**\n\n\n$$I_T = \\frac{1}{24}\\left[1.540302 + 2(10.072451)\\right] = 0.903550$$\n\n**(b) Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{1}{36}\\left[1.540302 + 4(5.438833) + 2(4.633617)\\right] = 0.904524$$\n\n**(c) Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{1}{32}\\left[1.540302 + 3(7.259566) + 2(2.812884)\\right] = 0.904524$$\n\n---\n\n### (iii) Evaluate $\\int_{0}^{0.5} (\\tan^{-1} x)^2\\,dx$ with $n = 18$\n\nHere, $h = \\frac{0.5 - 0}{18} = \\frac{1}{36}$. Tabulating $y_i = (\\tan^{-1} x_i)^2$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ | $8$ | $9$ |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0$ | $1/36$ | $2/36$ | $3/36$ | $4/36$ | $5/36$ | $6/36$ | $7/36$ | $8/36$ | $9/36$ |\n| $y_i$ | $0.000000$ | $0.000771$ | $0.003080$ | $0.006912$ | $0.012245$ | $0.019046$ | $0.027274$ | $0.036882$ | $0.047816$ | $0.060015$ |\n\n| $i$ | $10$ | $11$ | $12$ | $13$ | $14$ | $15$ | $16$ | $17$ | $18$ |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $10/36$ | $11/36$ | $12/36$ | $13/36$ | $14/36$ | $15/36$ | $16/36$ | $17/36$ | $18/36$ |\n| $y_i$ | $0.073412$ | $0.087940$ | $0.103524$ | $0.120092$ | $0.137562$ | $0.155864$ | $0.174921$ | $0.194637$ | $0.214969$ |\n\nGrouping the partial sums:\n\n* $y_0 + y_{18} = 0.214969$\n* $\\sum y_{\\text{odd}} = 0.682159$, $\\quad \\sum y_{\\text{even}} = 0.579834$, $\\quad \\sum_{i=1}^{17} y_i = 1.261993$\n* $\\sum y_{3k} = y_3 + y_6 + y_9 + y_{12} + y_{15} = 0.353589$, $\\quad \\sum y_{\\text{non-}3k} = 0.908404$\n\n**(a) Trapezoidal Rule:**\n\n\n$$I_T = \\frac{1}{72}\\left[0.214969 + 2(1.261993)\\right] = 0.038041$$\n\n**(b) Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{1}{108}\\left[0.214969 + 4(0.682159) + 2(0.579834)\\right] = 0.037993$$\n\n**(c) Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{1}{96}\\left[0.214969 + 3(0.908404) + 2(0.353589)\\right] = 0.037993$$\n\n---\n\n### (iv) Evaluate $\\int_{\\pi/4}^{\\pi/2} \\frac{\\sin x}{x}\\,dx$ with $n = 6$\n\nHere, $h = \\frac{\\pi/2 - \\pi/4}{6} = \\frac{\\pi}{24}$. Tabulating $y_i = \\frac{\\sin x_i}{x_i}$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $\\pi/4$ | $7\\pi/24$ | $\\pi/3$ | $3\\pi/8$ | $5\\pi/12$ | $11\\pi/24$ | $\\pi/2$ |\n| $y_i$ | $0.900316$ | $0.865825$ | $0.826993$ | $0.784213$ | $0.737913$ | $0.688553$ | $0.636620$ |\n\n**(a) Trapezoidal Rule:**\n\n\n$$I_T = \\frac{\\pi}{48}\\left[(0.900316 + 0.636620) + 2(0.865825 + 0.826993 + 0.784213 + 0.737913 + 0.688553)\\right]$$\n\n$$I_T = \\frac{\\pi}{48}(9.343930) = 0.611559$$\n\n**(b) Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{\\pi}{72}\\left[1.536936 + 4(0.865825 + 0.784213 + 0.688553) + 2(0.826993 + 0.737913)\\right]$$\n\n$$I_{1/3} = \\frac{\\pi}{72}(14.021112) = 0.611786$$\n\n**(c) Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{\\pi}{64}\\left[1.536936 + 3(0.865825 + 0.826993 + 0.737913 + 0.688553) + 2(0.784213)\\right]$$\n\n$$I_{3/8} = \\frac{\\pi}{64}(12.463214) = 0.611787$$\n\n---\n\n### (v) Evaluate $\\int_{0.4}^{1.6} \\frac{x}{\\sin x}\\,dx$ with $n = 12$\n\nHere, $h = \\frac{1.6 - 0.4}{12} = 0.1$. Tabulating $y_i = \\frac{x_i}{\\sin x_i}$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.4$ | $0.5$ | $0.6$ | $0.7$ | $0.8$ | $0.9$ | $1.0$ |\n| $y_i$ | $1.027173$ | $1.042915$ | $1.062619$ | $1.086589$ | $1.115206$ | $1.148946$ | $1.188395$ |\n\n| $i$ | $7$ | $8$ | $9$ | $10$ | $11$ | $12$ |\n| --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $1.1$ | $1.2$ | $1.3$ | $1.4$ | $1.5$ | $1.6$ |\n| $y_i$ | $1.234281$ | $1.287500$ | $1.349166$ | $1.420671$ | $1.503767$ | $1.600683$ |\n\nGrouping the sums:\n\n* $y_0 + y_{12} = 2.627856$\n* $\\sum y_{\\text{odd}} = 7.365663$, $\\quad \\sum y_{\\text{even}} = 6.074391$, $\\quad \\sum_{i=1}^{11} y_i = 13.440055$\n* $\\sum y_{3k} = y_3 + y_6 + y_9 = 3.624150$, $\\quad \\sum y_{\\text{non-}3k} = 9.815904$\n\n**(a) Trapezoidal Rule:**\n\n\n$$I_T = 0.05\\left[2.627856 + 2(13.440055)\\right] = 1.475398$$\n\n**(b) Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{0.1}{3}\\left[2.627856 + 4(7.365663) + 2(6.074391)\\right] = 1.474643$$\n\n**(c) Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{3(0.1)}{8}\\left[2.627856 + 3(9.815904) + 2(3.624150)\\right] = 1.474645$$\n\n---\n\n### (vi) Evaluate $\\int_{0.125}^{0.875} \\frac{\\cos x}{\\sqrt{x}}\\,dx$ with $n = 18$\n\nHere, $h = \\frac{0.875 - 0.125}{18} = \\frac{0.75}{18} = \\frac{1}{24}$. Tabulating $y_i = \\frac{\\cos x_i}{\\sqrt{x_i}}$:\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ | $8$ | $9$ |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $3/24$ | $4/24$ | $5/24$ | $6/24$ | $7/24$ | $8/24$ | $9/24$ | $10/24$ | $11/24$ | $12/24$ |\n| $y_i$ | $2.806359$ | $2.415548$ | $2.143516$ | $1.937825$ | $1.773439$ | $1.636713$ | $1.519513$ | $1.416649$ | $1.324642$ | $1.241089$ |\n\n| $i$ | $10$ | $11$ | $12$ | $13$ | $14$ | $15$ | $16$ | $17$ | $18$ |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $13/24$ | $14/24$ | $15/24$ | $16/24$ | $17/24$ | $18/24$ | $19/24$ | $20/24$ | $21/24$ |\n| $y_i$ | $1.164243$ | $1.092824$ | $1.025860$ | $0.962510$ | $0.902356$ | $0.844882$ | $0.789718$ | $0.736591$ | $0.685254$ |\n\nGrouping the sums:\n\n* $y_0 + y_{18} = 3.491613$\n* $\\sum y_{\\text{odd}} = 12.284631$, $\\quad \\sum y_{\\text{even}} = 10.643289$, $\\quad \\sum_{i=1}^{17} y_i = 22.927919$\n* $\\sum y_{3k} = y_3 + y_6 + y_9 + y_{12} + y_{15} = 6.569168$, $\\quad \\sum y_{\\text{non-}3k} = 16.358751$\n\n**(a) Trapezoidal Rule:**\n\n\n$$I_T = \\frac{1}{48}\\left[3.491613 + 2(22.927919)\\right] = 1.028072$$\n\n**(b) Simpson's $1/3$ Rule:**\n\n\n$$I_{1/3} = \\frac{1}{72}\\left[3.491613 + 4(12.284631) + 2(10.643289)\\right] = 1.026621$$\n\n**(c) Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{1}{64}\\left[3.491613 + 3(16.358751) + 2(6.569168)\\right] = 1.026659$$\n\n---\n\n## Question 2\n\nWe need to approximate $I = \\int_0^1 \\frac{1}{1+x^2}\\,dx$ using $n = 10$, which gives $h = \\frac{1 - 0}{10} = 0.1$.\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ | $8$ | $9$ | $10$ |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.0$ | $0.1$ | $0.2$ | $0.3$ | $0.4$ | $0.5$ | $0.6$ | $0.7$ | $0.8$ | $0.9$ | $1.0$ |\n| $y_i$ | $1.000000$ | $0.990099$ | $0.961538$ | $0.917431$ | $0.862069$ | $0.800000$ | $0.735294$ | $0.671141$ | $0.609756$ | $0.552486$ | $0.500000$ |\n\n**1. Trapezoidal Rule:**\n\n\n$$T(10) = \\frac{0.1}{2}\\left[(1 + 0.5) + 2(7.099814)\\right] = 0.784981$$\n\n**2. Simpson's $1/3$ Rule:**\n\n\n$$S(10) = \\frac{0.1}{3}\\left[(1 + 0.5) + 4(3.931157) + 2(3.168657)\\right] = 0.785398$$\n\n**3. Approximating $\\pi$:**\nEvaluating the exact integral:\n\n\n$$\\int_0^1 \\frac{1}{1+x^2}\\,dx = \\left[\\tan^{-1} x\\right]_0^1 = \\frac{\\pi}{4}$$\n\n\nMultiplying our approximations by $4$:\n\n* From Trapezoidal Rule: $\\pi \\approx 4(0.784981) = 3.139924$\n* From Simpson's $1/3$ Rule: $\\pi \\approx 4(0.785398) = 3.141592$\n\n---\n\n## Question 3\n\nWe evaluate $\\int_0^{1.2} e^{-x^2}\\,dx$ with $h = 0.2$, so $n = \\frac{1.2 - 0}{0.2} = 6$.\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.0$ | $0.2$ | $0.4$ | $0.6$ | $0.8$ | $1.0$ | $1.2$ |\n| $y_i$ | $1.000000$ | $0.960789$ | $0.852144$ | $0.697676$ | $0.527292$ | $0.367879$ | $0.236928$ |\n\n**Trapezoidal Rule Evaluation:**\n\n\n$$I_T = \\frac{0.2}{2}\\left[(1 + 0.236928) + 2(0.960789 + 0.852144 + 0.697676 + 0.527292 + 0.367879)\\right]$$\n\n$$I_T = 0.1(8.048488) = 0.8048$$\n\n**Error Bound Estimate:**\nThe error bound formula for the Trapezoidal rule is:\n\n\n$$\\lvert E_T \\rvert \\le \\frac{(b-a)h^2}{12} \\max_{x \\in [0, 1.2]} \\lvert f''(x) \\rvert$$\n\nDifferentiating $f(x) = e^{-x^2}$:\n\n\n$$f'(x) = -2xe^{-x^2}$$\n\n$$f''(x) = (4x^2 - 2)e^{-x^2}$$\n\n$$f'''(x) = 4x(3 - 2x^2)e^{-x^2}$$\n\nSetting $f'''(x) = 0$ gives $x = 0$ on $[0, 1.2]$ (since $\\sqrt{1.5} \\approx 1.225$ lies outside the interval). Checking the endpoints:\n\n* $\\lvert f''(0) \\rvert = \\lvert -2 \\rvert = 2$\n* $\\lvert f''(1.2) \\rvert = 3.76e^{-1.44} \\approx 0.8908$\n\nThus, $\\max_{x \\in [0, 1.2]} \\lvert f''(x) \\rvert = 2$. Substituting this into the error formula:\n\n\n$$\\lvert E_T \\rvert \\le \\frac{1.2 \\times (0.2)^2}{12} \\times 2 = 0.008$$\n\n---\n\n## Question 4\n\nGiven $f(x) = \\frac{1}{1+x^2}$ on $[0, 1]$, we first find its fourth derivative:\n\n\n$$f'(x) = -\\frac{2x}{(1+x^2)^2}$$\n\n$$f''(x) = \\frac{6x^2 - 2}{(1+x^2)^3}$$\n\n$$f'''(x) = \\frac{24x - 24x^3}{(1+x^2)^4}$$\n\n$$f^{(4)}(x) = \\frac{24(1 - 10x^2 + 5x^4)}{(1+x^2)^5}$$\n\nOn $[0, 1]$, the maximum of $\\lvert f^{(4)}(x) \\rvert$ occurs at $x = 0$, giving $M_4 = \\lvert f^{(4)}(0) \\rvert = 24$.\n\nUsing the composite Simpson's $1/3$ error bound with tolerance $5 \\times 10^{-6}$:\n\n\n$$\\lvert E_S \\rvert \\le \\frac{(b-a)^5}{180 n^4} M_4 \\le 5 \\times 10^{-6}$$\n\n$$\\frac{1^5 \\times 24}{180 n^4} \\le 5 \\times 10^{-6} \\implies n^4 \\ge \\frac{24}{180 \\times 5 \\times 10^{-6}} = \\frac{8000}{3} \\approx 2666.67$$\n\n\nTaking the fourth root gives $n \\ge 7.19$.\n\nHence, since $n$ must be an even integer for Simpson's $1/3$ rule, the minimum number of subintervals required is $n = 8$ (or $n = 14$ if $n = 2m$ with $m \\ge 7.19$).\n\n---\n\n## Question 5\n\nWe evaluate $I = \\int_0^{1.2} \\left(\\sin x - \\ln(1+x) + e^x\\right) dx$ using $h = 0.1$, which gives $n = \\frac{1.2 - 0}{0.1} = 12$.\n\n| $i$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.0$ | $0.1$ | $0.2$ | $0.3$ | $0.4$ | $0.5$ | $0.6$ |\n| $y_i$ | $1.000000$ | $1.109694$ | $1.237751$ | $1.383015$ | $1.544771$ | $1.722682$ | $1.916758$ |\n\n| $i$ | $7$ | $8$ | $9$ | $10$ | $11$ | $12$ |\n| --- | --- | --- | --- | --- | --- | --- |\n| $x_i$ | $0.7$ | $0.8$ | $0.9$ | $1.0$ | $1.1$ | $1.2$ |\n| $y_i$ | $2.127342$ | $2.355110$ | $2.601076$ | $2.866606$ | $3.153436$ | $3.463699$ |\n\n**Simpson's $3/8$ Rule:**\n\n\n$$I_{3/8} = \\frac{3(0.1)}{8}\\left[(1 + 3.463699) + 3(16.117391) + 2(5.900849)\\right]$$\n\n$$I_{3/8} = 0.0375(64.617569) = 2.42316$$\n\n**Exact Value:**\n\n\n$$I_{\\text{exact}} = \\left[-\\cos x - (1+x)\\ln(1+x) + x + e^x\\right]_0^{1.2}$$\n\n$$I_{\\text{exact}} = \\left[-\\cos(1.2) - 2.2\\ln(2.2) + 1.2 + e^{1.2}\\right] - [-1 + 1] = 2.42315$$\n\n**Comparison:**\nThe absolute error between the approximation and the exact integral is $\\lvert 2.423153 - 2.423159 \\rvert = 6 \\times 10^{-6}$.\n\n---\n\n## Question 6\n\nTo apply Gauss-Legendre quadrature, we shift the limits from $[a, b]$ to $[-1, 1]$ using:\n\n\n$$x = \\frac{b-a}{2}t + \\frac{a+b}{2}, \\quad dx = \\frac{b-a}{2}\\,dt$$\n\n* **2-point formula:** $\\int_{-1}^{1} g(t)\\,dt \\approx g(-0.577350) + g(0.577350)$\n* **3-point formula:** $\\int_{-1}^{1} g(t)\\,dt \\approx \\frac{5}{9}g(-0.774597) + \\frac{8}{9}g(0) + \\frac{5}{9}g(0.774597)$\n\n---\n\n### (a) $\\int_{0.2}^{1.5} e^{-x^2}\\,dx$\n\nHere, $x = 0.65t + 0.85$ and $dx = 0.65\\,dt$.\n\n* **2-point:** Nodes are $x_1 = 0.474722$ and $x_2 = 1.225278$.\n\n$$I_2 = 0.65\\left(e^{-0.474722^2} + e^{-1.225278^2}\\right) = 0.65(0.798228 + 0.222839) = 0.66369$$\n\n\n* **3-point:** Nodes are $x_1 = 0.346512$, $x_2 = 0.85$, and $x_3 = 1.353488$.\n\n$$I_3 = 0.65\\left[\\frac{5}{9}(0.886858 + 0.160104) + \\frac{8}{9}(0.485537)\\right] = 0.658602$$\n\n\n\n---\n\n### (b) $\\int_{0}^{\\pi} \\sin(x^2)\\,dx$\n\nHere, $x = \\frac{\\pi}{2}(t+1)$ and $dx = \\frac{\\pi}{2}\\,dt$.\n\n* **2-point:** Nodes are $x_1 = 0.663897$ and $x_2 = 2.477696$.\n\n$$I_2 = \\frac{\\pi}{2}\\left[\\sin(0.663897^2) + \\sin(2.477696^2)\\right] = \\frac{\\pi}{2}(0.426625 - 0.143709) = 0.44441$$\n\n\n* **3-point:** Nodes are $x_1 = 0.354063$, $x_2 = \\frac{\\pi}{2}$, and $x_3 = 2.787530$.\n\n$$I_3 = \\frac{\\pi}{2}\\left[\\frac{5}{9}(0.125032 + 0.996507) + \\frac{8}{9}(0.624266)\\right] = 1.85036$$\n\n\n\n---\n\n### (c) $\\int_{-4}^{4} \\frac{1}{1+x^2}\\,dx$\n\nHere, $x = 4t$ and $dx = 4\\,dt$.\n\n* **2-point:** For $t = \\pm\\frac{1}{\\sqrt{3}}$, we have $x^2 = \\frac{16}{3}$.\n\n$$I_2 = 4\\left(\\frac{1}{1 + 16/3} + \\frac{1}{1 + 16/3}\\right) = 4\\left(\\frac{6}{19}\\right) = 1.26316$$\n\n\n* **3-point:** For $t = \\pm\\sqrt{\\frac{3}{5}}$, $x^2 = \\frac{48}{5}$, and at $t = 0$, $x^2 = 0$.\n\n$$I_3 = 4\\left[\\frac{5}{9}\\left(\\frac{5}{53} + \\frac{5}{53}\\right) + \\frac{8}{9}(1)\\right] = \\frac{632}{159} = 3.97484$$\n\n\n\n---\n\n### (d) $\\int_{0}^{\\pi/2} \\frac{1}{\\sqrt{1 - 0.25\\sin^2 x}}\\,dx$\n\nHere, $x = \\frac{\\pi}{4}(t+1)$ and $dx = \\frac{\\pi}{4}\\,dt$.\n\n* **2-point:** Nodes are $x_1 = 0.331948$ and $x_2 = 1.238848$.\n\n$$I_2 = \\frac{\\pi}{4}(1.013546 + 1.134819) = 1.68732$$\n\n\n* **3-point:** Nodes are $x_1 = 0.177031$, $x_2 = \\frac{\\pi}{4}$, and $x_3 = 1.393765$.\n\n$$I_3 = \\frac{\\pi}{4}\\left[\\frac{5}{9}(1.003900 + 1.148776) + \\frac{8}{9}(1.069045)\\right] = 1.68562$$\n\n\n\n---\n\n## Question 7\n\nLet $h = \\frac{b-a}{2m}$ and define the grid points $x_i = a + ih$ for $i = 0, 1, \\dots, 2m$.\n\nFor $m$ subintervals, the step size is $H = 2h$ and the nodes are $x_{2k}$ ($k = 0, 1, \\dots, m$). Applying the composite Trapezoidal rule gives:\n\n\n$$T(m) = \\frac{2h}{2}\\left[f(x_0) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right] = h\\left[f(x_0) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right]$$\n\nFor $2m$ subintervals, the step size is $h$, and splitting the interior sum into odd and even indices yields:\n\n\n$$T(2m) = \\frac{h}{2}\\left[f(x_0) + 2\\sum_{k=1}^{m} f(x_{2k-1}) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right]$$\n\nNow, substituting both expressions into $\\frac{1}{3}(4T(2m) - T(m))$:\n\n\n$$\\begin{aligned} \\frac{1}{3}(4T(2m) - T(m)) &= \\frac{1}{3}\\left(2h\\left[f(x_0) + 2\\sum_{k=1}^{m} f(x_{2k-1}) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right] - h\\left[f(x_0) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right]\\right) \\\\ &= \\frac{h}{3}\\left[f(x_0) + 4\\sum_{k=1}^{m} f(x_{2k-1}) + (4 - 2)\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right] \\\\ &= \\frac{h}{3}\\left[f(x_0) + 4\\sum_{k=1}^{m} f(x_{2k-1}) + 2\\sum_{k=1}^{m-1} f(x_{2k}) + f(x_{2m})\\right] = S(2m) \\end{aligned}$$\n\n\nHence proved.\n\n---\n\n## Question 8\n\n**1. Finding the weights $c_j$:**\nWe require the quadrature formula $\\int_0^1 f(x)\\,dx = c_{-1}f(-1) + c_0f(0) + c_1f(1) + c_2f(2)$ to be exact for the basis polynomials $1, x, x^2, x^3$:\n\n* For $f(x) = 1$: $\\quad c_{-1} + c_0 + c_1 + c_2 = 1 \\quad \\text{--- (1)}$\n* For $f(x) = x$: $\\quad -c_{-1} + c_1 + 2c_2 = \\frac{1}{2} \\quad \\text{--- (2)}$\n* For $f(x) = x^2$: $\\quad c_{-1} + c_1 + 4c_2 = \\frac{1}{3} \\quad \\text{--- (3)}$\n* For $f(x) = x^3$: $\\quad -c_{-1} + c_1 + 8c_2 = \\frac{1}{4} \\quad \\text{--- (4)}$\n\nSubtracting eq. (2) from eq. (4):\n\n\n$$6c_2 = -\\frac{1}{4} \\implies c_2 = -\\frac{1}{24}$$\n\nAdding eq. (2) and eq. (3):\n\n\n$$2c_1 + 6c_2 = \\frac{5}{6} \\implies 2c_1 - \\frac{1}{4} = \\frac{5}{6} \\implies 2c_1 = \\frac{13}{12} \\implies c_1 = \\frac{13}{24}$$\n\nSubstituting $c_1$ and $c_2$ back into eq. (2):\n\n\n$$-c_{-1} + \\frac{13}{24} - \\frac{2}{24} = \\frac{12}{24} \\implies c_{-1} = -\\frac{1}{24}$$\n\nFinally, from eq. (1):\n\n\n$$c_0 = 1 - \\left(-\\frac{1}{24} + \\frac{13}{24} - \\frac{1}{24}\\right) = 1 - \\frac{11}{24} = \\frac{13}{24}$$\n\nTherefore, the weights are $c_{-1} = -\\frac{1}{24}$, $c_0 = \\frac{13}{24}$, $c_1 = \\frac{13}{24}$, and $c_2 = -\\frac{1}{24}$.\n\n**2. Differentiability Condition and $M_4$:**\nWe must assume $f \\in C^4[-1, 2]$ (four times continuously differentiable on $[-1, 2]$), and define $M_4 = \\max_{x \\in [-1, 2]} \\lvert f^{(4)}(x) \\rvert$.\n\n**3. Deriving the Error Bound:**\nLet $p_3(x)$ be the cubic Lagrange interpolating polynomial matching $f(x)$ at the nodes $x = -1, 0, 1, 2$. Since $Q$ is exact for all polynomials up to degree $3$ and $p_3(j) = f(j)$, we have $Q(f) = Q(p_3) = \\int_0^1 p_3(x)\\,dx$.\n\nBy the Lagrange interpolation remainder theorem, for any $x \\in [0, 1]$ there exists $\\xi(x) \\in (-1, 2)$ such that:\n\n\n$$f(x) - p_3(x) = \\frac{f^{(4)}(\\xi(x))}{4!}(x+1)x(x-1)(x-2)$$\n\nNotice that for $x \\in [0, 1]$, the product $(x+1)x(1-x)(2-x) \\ge 0$ does not change sign. Taking absolute values and integrating over $[0, 1]$:\n\n\n$$\\left\\lvert \\int_0^1 f(x)\\,dx - Q(f) \\right\\rvert \\le \\frac{M_4}{24}\\int_0^1 (x+1)x(1-x)(2-x)\\,dx$$\n\n\nExpanding the integrand:\n\n\n$$(x+1)x(1-x)(2-x) = (x - x^3)(2 - x) = -x^4 + 2x^3 + x^2 - 2x$$\n\n\nWait \u2014 keeping track of the positive sign on $[0, 1]$, $(x+1)x(1-x)(2-x) = x^4 - 2x^3 - x^2 + 2x$:\n\n\n$$\\int_0^1 (x^4 - 2x^3 - x^2 + 2x)\\,dx = \\left[\\frac{x^5}{5} - \\frac{x^4}{2} - \\frac{x^3}{3} + x^2\\right]_0^1 = \\frac{1}{5} - \\frac{1}{2} - \\frac{1}{3} + 1 = \\frac{11}{30}$$\n\nSubstituting this back into our inequality:\n\n\n$$\\left\\lvert \\int_0^1 f(x)\\,dx - Q(f) \\right\\rvert \\le \\frac{M_4}{24} \\cdot \\frac{11}{30} = \\frac{11}{720}M_4$$\n\n\nHence proved.\n\n---\n\n## Question 9\n\nLet $m = \\frac{a+b}{2}$ be the midpoint and $h = \\frac{b-a}{2}$ be the half-width, so $a = m - h$ and $b = m + h$. Define the shifted function $g(t) = f(m+t)$ for $t \\in [-h, h]$.\n\nFor $u \\in [0, h]$, consider the error function:\n\n\n$$\\phi(u) = \\int_{-u}^{u} g(t)\\,dt - \\frac{u}{3}\\left[g(-u) + 4g(0) + g(u)\\right]$$\n\nDifferentiating $\\phi(u)$ three times with respect to $u$:\n\n\n$$\\phi'(u) = g(u) + g(-u) - \\frac{1}{3}[g(-u) + 4g(0) + g(u)] - \\frac{u}{3}[g'(u) - g'(-u)] = \\frac{2}{3}[g(u) + g(-u) - 2g(0)] - \\frac{u}{3}[g'(u) - g'(-u)]$$\n\n$$\\phi''(u) = \\frac{2}{3}[g'(u) - g'(-u)] - \\frac{1}{3}[g'(u) - g'(-u)] - \\frac{u}{3}[g''(u) + g''(-u)] = \\frac{1}{3}[g'(u) - g'(-u)] - \\frac{u}{3}[g''(u) + g''(-u)]$$\n\n$$\\phi'''(u) = \\frac{1}{3}[g''(u) + g''(-u)] - \\frac{1}{3}[g''(u) + g''(-u)] - \\frac{u}{3}[g'''(u) - g'''(-u)] = -\\frac{u}{3}[g'''(u) - g'''(-u)]$$\n\nApplying the Mean Value Theorem to $g'''$ on $[-u, u]$, there exists $c(u) \\in (-u, u)$ such that $g'''(u) - g'''(-u) = 2u g^{(4)}(c(u))$. Substituting this in gives:\n\n\n$$\\phi'''(u) = -\\frac{2}{3}u^2 g^{(4)}(c(u))$$\n\nLet $m_4 = \\min_{x \\in [a, b]} f^{(4)}(x)$ and $M_4 = \\max_{x \\in [a, b]} f^{(4)}(x)$. Since $g^{(4)}(c(u)) = f^{(4)}(m + c(u))$, we can bound $\\phi'''(u)$:\n\n\n$$-\\frac{2}{3}M_4 u^2 \\le \\phi'''(u) \\le -\\frac{2}{3}m_4 u^2$$\n\nNotice that $\\phi(0) = \\phi'(0) = \\phi''(0) = 0$. Integrating the inequality three times from $0$ to $h$:\n\n1. First integration: $-\\frac{2}{9}M_4 u^3 \\le \\phi''(u) \\le -\\frac{2}{9}m_4 u^3$\n2. Second integration: $-\\frac{1}{18}M_4 u^4 \\le \\phi'(u) \\le -\\frac{1}{18}m_4 u^4$\n3. Third integration (at $u = h$):\n\n$$-\\frac{1}{90}M_4 h^5 \\le \\phi(h) \\le -\\frac{1}{90}m_4 h^5$$\n\n\n\nSince $f^{(4)}$ is continuous on $[a, b]$, by the Intermediate Value Theorem there exists some $\\xi \\in (a, b)$ such that:\n\n\n$$\\phi(h) = -\\frac{h^5}{90}f^{(4)}(\\xi)$$\n\nFinally, substituting $h = \\frac{b-a}{2}$ and rewriting $\\phi(h)$ in terms of $f$:\n\n\n$$\\int_a^b f(x)\\,dx - \\frac{b-a}{6}\\left(f(a) + 4f\\left(\\frac{a+b}{2}\\right) + f(b)\\right) = -\\frac{(b-a)^5}{32 \\times 90}f^{(4)}(\\xi) = -\\frac{(b-a)^5}{2880}f^{(4)}(\\xi)$$\n\n\nTherefore, the error formula for Simpson's $1/3$ rule is established.\n\n[ROUGH_WORK]\n24 / (180 * 5e-6) = 24 / 0.0009 = 2666.6667\n2666.67^(1/4) -> sqrt(2666.67) \u2248 51.64 -> sqrt(51.64) \u2248 7.186 -> even n = 8\n(x+1)x(1-x)(2-x) = x(1 - x^2)(2 - x) = (x - x^3)(2 - x) = 2x - x^2 - 2x^3 + x^4\n1/5 - 1/2 - 1/3 + 1 = (6 - 15 - 10 + 30) / 30 = 11 / 30\n24 * 30 = 720 -> 11/720\n2^5 * 90 = 32 * 90 = 2880"
},
  {
    id: 'fourier-series-assignment',
    title: 'Mathematical Methods: Periodic Functions & Fourier Series',
    description: 'Fourier series, periodic waveforms, Dirichlet conditions, half-range expansions, and Parseval identity.',
    content: "[METADATA]\nTitle: Mathematical Methods: Periodic Functions & Fourier Series\nDate: 10/11/2026\n\n[MAIN_WORK]\n\n# Mathematical Methods: Periodic Functions & Fourier Series\n\n---\n\n### Question 1\n\n**Given:**\n\n\n$$f(x) = \\begin{cases} 1, & \\vert{}x\\vert{} \\le a \\\\ 0, & \\vert{}x\\vert{} > a \\end{cases} \\quad (a > 0)$$\n\n#### (i) Fourier Integral Representation\n\nThe general Fourier integral representation is:\n\n\n$$f(x) \\sim \\frac{1}{\\pi} \\int_0^\\infty [A(\\omega)\\cos(\\omega x) + B(\\omega)\\sin(\\omega x)] \\, d\\omega$$\n\nSince $f(x)$ is symmetric about the y-axis (even function), the sine coefficient vanishes:\n\n\n$$B(\\omega) = 0$$\n\nNow computing $A(\\omega)$:\n\n\n$$A(\\omega) = 2\\int_0^a 1 \\cdot \\cos(\\omega v) \\, dv = 2\\left[\\frac{\\sin(\\omega v)}{\\omega}\\right]_0^a = \\frac{2\\sin(a\\omega)}{\\omega}$$\n\nPlugging $A(\\omega)$ and $B(\\omega) = 0$ back into the integral gives:\n\n\n$$\\boxed{f(x) \\sim \\frac{2}{\\pi} \\int_0^\\infty \\frac{\\sin(a\\omega)\\cos(\\omega x)}{\\omega} \\, d\\omega}$$\n\n#### (ii) Evaluation of Integrals\n\nApplying Dirichlet's condition at continuity and jump points:\n\n\n$$\\frac{2}{\\pi}\\int_0^\\infty \\frac{\\sin(a\\omega)\\cos(\\omega x)}{\\omega} \\, d\\omega = \\begin{cases} 1, & \\vert{}x\\vert{} < a \\\\ \\frac{1+0}{2} = \\frac{1}{2}, & \\vert{}x\\vert{} = a \\\\ 0, & \\vert{}x\\vert{} > a \\end{cases}$$\n\nMultiplying across by $\\frac{\\pi}{2}$:\n\n\n$$\\int_0^\\infty \\frac{\\sin(a\\omega)\\cos(\\omega x)}{\\omega} \\, d\\omega = \\begin{cases} \\frac{\\pi}{2}, & \\vert{}x\\vert{} < a \\\\ \\frac{\\pi}{4}, & \\vert{}x\\vert{} = a \\\\ 0, & \\vert{}x\\vert{} > a \\end{cases}$$\n\nBecause the integrand is an even function with respect to $\\omega$, extending the integral from $-\\infty$ to $\\infty$ doubles the value:\n\n\n$$\\int_{-\\infty}^\\infty \\frac{\\sin(a\\omega)\\cos(\\omega x)}{\\omega} \\, d\\omega = 2\\int_0^\\infty \\frac{\\sin(a\\omega)\\cos(\\omega x)}{\\omega} \\, d\\omega = \\begin{cases} \\pi, & \\vert{}x\\vert{} < a \\\\ \\frac{\\pi}{2}, & \\vert{}x\\vert{} = a \\\\ 0, & \\vert{}x\\vert{} > a \\end{cases}$$\n\nSetting $a = 1$:\n\n\n$$\\boxed{\\int_{-\\infty}^\\infty \\frac{\\sin \\omega \\cos(\\omega x)}{\\omega} \\, d\\omega = \\begin{cases} \\pi, & \\vert{}x\\vert{} < 1 \\\\ \\frac{\\pi}{2}, & \\vert{}x\\vert{} = 1 \\\\ 0, & \\vert{}x\\vert{} > 1 \\end{cases}}$$\n\nTo find $\\int_0^\\infty \\frac{\\sin \\omega}{\\omega} \\, d\\omega$, plug $a = 1$ and $x = 0$ into our semi-infinite result. Since $\\vert{}0\\vert{} < 1$:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\sin \\omega}{\\omega} \\, d\\omega = \\frac{\\pi}{2}}$$\n\n---\n\n### Question 2\n\n**Given:**\n\n\n$$f(x) = e^{-kx}, \\quad x \\ge 0 \\quad (k > 0)$$\n\n#### (i) Fourier Cosine Integral Representation\n\n$$f(x) \\sim \\frac{2}{\\pi}\\int_0^\\infty A(\\omega)\\cos(\\omega x) \\, d\\omega$$\n\nEvaluating the cosine coefficient $A(\\omega)$:\n\n\n$$A(\\omega) = \\int_0^\\infty e^{-kv}\\cos(\\omega v) \\, dv = \\left[ \\frac{e^{-kv}}{k^2+\\omega^2}(-k\\cos(\\omega v) + \\omega\\sin(\\omega v)) \\right]_0^\\infty = \\frac{k}{k^2+\\omega^2}$$\n\nHence, the representation is:\n\n\n$$f(x) \\sim \\frac{2k}{\\pi}\\int_0^\\infty \\frac{\\cos(\\omega x)}{k^2+\\omega^2} \\, d\\omega$$\n\nBy the inversion theorem, for $x > 0$:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\cos(\\omega x)}{k^2+\\omega^2} \\, d\\omega = \\frac{\\pi}{2k}e^{-kx}} \\quad \\cdots (1)$$\n\n#### (ii) Fourier Sine Integral Representation\n\n$$f(x) \\sim \\frac{2}{\\pi}\\int_0^\\infty B(\\omega)\\sin(\\omega x) \\, d\\omega$$\n\nEvaluating $B(\\omega)$:\n\n\n$$B(\\omega) = \\int_0^\\infty e^{-kv}\\sin(\\omega v) \\, dv = \\left[ \\frac{e^{-kv}}{k^2+\\omega^2}(-k\\sin(\\omega v) - \\omega\\cos(\\omega v)) \\right]_0^\\infty = \\frac{\\omega}{k^2+\\omega^2}$$\n\nTherefore:\n\n\n$$f(x) \\sim \\frac{2}{\\pi}\\int_0^\\infty \\frac{\\omega\\sin(\\omega x)}{k^2+\\omega^2} \\, d\\omega$$\n\nFor $x > 0$:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\omega\\sin(\\omega x)}{k^2+\\omega^2} \\, d\\omega = \\frac{\\pi}{2}e^{-kx}} \\quad \\cdots (2)$$\n\n#### (iii) Deduction\n\nLet $k = 1$ in (1) and (2).\n\n* **For $x > 0$:**\nAdding both integrals:\n\n$$\\int_0^\\infty \\frac{\\cos(\\omega x) + \\omega\\sin(\\omega x)}{1+\\omega^2} \\, d\\omega = \\frac{\\pi}{2}e^{-x} + \\frac{\\pi}{2}e^{-x} = \\pi e^{-x}$$\n\n\n* **For $x = 0$:**\n\n$$\\int_0^\\infty \\frac{\\cos(0) + \\omega\\sin(0)}{1+\\omega^2} \\, d\\omega = \\int_0^\\infty \\frac{1}{1+\\omega^2} \\, d\\omega = \\left[\\arctan(\\omega)\\right]_0^\\infty = \\frac{\\pi}{2}$$\n\n\n* **For $x < 0$:**\nLet $x = -y$ with $y > 0$. Using $\\cos(-\\omega y) = \\cos(\\omega y)$ and $\\sin(-\\omega y) = -\\sin(\\omega y)$:\n\n$$\\int_0^\\infty \\frac{\\cos(\\omega y) - \\omega\\sin(\\omega y)}{1+\\omega^2} \\, d\\omega = \\frac{\\pi}{2}e^{-y} - \\frac{\\pi}{2}e^{-y} = 0$$\n\n\n\nPutting all cases together:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\cos(x\\omega) + \\omega\\sin(x\\omega)}{1+\\omega^2} \\, d\\omega = \\begin{cases} 0, & x < 0 \\\\ \\frac{\\pi}{2}, & x = 0 \\\\ \\pi e^{-x}, & x > 0 \\end{cases}}$$\n\n---\n\n### Question 3\n\n**Goal:** Show that $e^{-x}\\cos x = \\frac{2}{\\pi}\\int_0^\\infty \\frac{\\omega^2+2}{\\omega^4+4}\\cos(\\omega x) \\, d\\omega$ for $x \\ge 0$.\n\nRepresent $f(x) = e^{-x}\\cos x$ via Fourier cosine integral:\n\n\n$$f(x) = \\frac{2}{\\pi}\\int_0^\\infty A(\\omega)\\cos(\\omega x) \\, d\\omega$$\n\n\nwhere\n\n\n$$A(\\omega) = \\int_0^\\infty e^{-v}\\cos v \\cos(\\omega v) \\, dv$$\n\nUsing the product-to-sum identity $\\cos v\\cos(\\omega v) = \\frac{1}{2}[\\cos(\\omega+1)v + \\cos(\\omega-1)v]$:\n\n\n$$A(\\omega) = \\frac{1}{2}\\int_0^\\infty e^{-v}\\cos(\\omega+1)v \\, dv + \\frac{1}{2}\\int_0^\\infty e^{-v}\\cos(\\omega-1)v \\, dv$$\n\nUsing the standard Laplace integral $\\int_0^\\infty e^{-av}\\cos(bv)\\,dv = \\frac{a}{a^2+b^2}$ with $a=1$:\n\n\n$$A(\\omega) = \\frac{1}{2}\\left[\\frac{1}{1+(\\omega+1)^2} + \\frac{1}{1+(\\omega-1)^2}\\right] = \\frac{1}{2}\\left[\\frac{1}{\\omega^2+2\\omega+2} + \\frac{1}{\\omega^2-2\\omega+2}\\right]$$\n\nFinding a common denominator:\n\n\n$$A(\\omega) = \\frac{1}{2}\\left[\\frac{(\\omega^2-2\\omega+2) + (\\omega^2+2\\omega+2)}{[(\\omega^2+2) + 2\\omega][(\\omega^2+2) - 2\\omega]}\\right] = \\frac{1}{2}\\left[\\frac{2(\\omega^2+2)}{(\\omega^2+2)^2 - 4\\omega^2}\\right]$$\n\nSimplifying denominator: $(\\omega^4 + 4\\omega^2 + 4) - 4\\omega^2 = \\omega^4 + 4$.\n\n\n$$A(\\omega) = \\frac{\\omega^2+2}{\\omega^4+4}$$\n\nSubstituting $A(\\omega)$ into the Fourier cosine integral:\n\n\n$$\\boxed{e^{-x}\\cos x = \\frac{2}{\\pi}\\int_0^\\infty \\frac{\\omega^2+2}{\\omega^4+4}\\cos(\\omega x) \\, d\\omega} \\quad \\text{Q.E.D.}$$\n\n---\n\n### Question 4\n\n**Given Integral Equation:**\n\n\n$$\\int_0^\\infty f(x)\\cos(\\omega x) \\, dx = g(\\omega) = \\begin{cases} 1-\\omega, & 0 \\le \\omega \\le 1 \\\\ 0, & \\omega > 1 \\end{cases}$$\n\nUsing Fourier cosine inversion:\n\n\n$$f(x) = \\frac{2}{\\pi}\\int_0^\\infty g(\\omega)\\cos(\\omega x) \\, d\\omega = \\frac{2}{\\pi}\\int_0^1 (1-\\omega)\\cos(\\omega x) \\, d\\omega$$\n\nIntegrating by parts with $u = 1-\\omega \\implies du = -d\\omega$ and $dv = \\cos(\\omega x)d\\omega \\implies v = \\frac{\\sin(\\omega x)}{x}$:\n\n\n$$\\int_0^1 (1-\\omega)\\cos(\\omega x) \\, d\\omega = \\left[(1-\\omega)\\frac{\\sin(\\omega x)}{x}\\right]_0^1 - \\int_0^1 (-1)\\frac{\\sin(\\omega x)}{x} \\, d\\omega$$\n\n$$= 0 + \\frac{1}{x}\\left[-\\frac{\\cos(\\omega x)}{x}\\right]_0^1 = \\frac{1 - \\cos x}{x^2}$$\n\nMultiplying by the leading factor $\\frac{2}{\\pi}$:\n\n\n$$\\boxed{f(x) = \\frac{2(1-\\cos x)}{\\pi x^2}, \\quad x > 0}$$\n\n---\n\n### Question 5\n\nFourier transform definition:\n\n\n$$\\hat{f}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\int_{-\\infty}^\\infty f(x)e^{-i\\omega x} \\, dx$$\n\n#### (i) For $f(x) = u_0(x)e^{-x}$:\n\n$$\\hat{f}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\int_0^\\infty e^{-(1+i\\omega)x} \\, dx = \\frac{1}{\\sqrt{2\\pi}}\\left[\\frac{e^{-(1+i\\omega)x}}{-(1+i\\omega)}\\right]_0^\\infty = \\boxed{\\frac{1}{\\sqrt{2\\pi}(1+i\\omega)}}$$\n\n#### (ii) For $f(x) = e^{-a\\vert{}x\\vert{}}$ ($a > 0$):\n\nSince $f(x)$ is even, the sine part drops:\n\n\n$$\\hat{f}(\\omega) = \\frac{2}{\\sqrt{2\\pi}}\\int_0^\\infty e^{-ax}\\cos(\\omega x) \\, dx = \\sqrt{\\frac{2}{\\pi}}\\left[\\frac{a}{a^2+\\omega^2}\\right] = \\boxed{\\sqrt{\\frac{2}{\\pi}}\\frac{a}{a^2+\\omega^2}}$$\n\n#### (iii) For $f(x) = e^{-ax^2}$ ($a > 0$):\n\n$$\\hat{f}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\int_{-\\infty}^\\infty e^{-ax^2 - i\\omega x} \\, dx$$\n\nCompleting the square in the exponent:\n\n\n$$-a\\left(x^2 + \\frac{i\\omega}{a}x\\right) = -a\\left(x + \\frac{i\\omega}{2a}\\right)^2 - \\frac{\\omega^2}{4a}$$\n\nFactoring the constant exponential out:\n\n\n$$\\hat{f}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}e^{-\\frac{\\omega^2}{4a}}\\int_{-\\infty}^\\infty e^{-a\\left(x + \\frac{i\\omega}{2a}\\right)^2} \\, dx$$\n\nUsing Gaussian integral $\\int_{-\\infty}^\\infty e^{-au^2} \\, du = \\sqrt{\\frac{\\pi}{a}}$:\n\n\n$$\\hat{f}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}e^{-\\frac{\\omega^2}{4a}}\\sqrt{\\frac{\\pi}{a}} = \\boxed{\\frac{1}{\\sqrt{2a}}e^{-\\frac{\\omega^2}{4a}}}$$\n\n---\n\n### Question 6\n\n**Evaluate:** $\\mathcal{F}^{-1}\\left[\\frac{1}{12+7i\\omega-\\omega^2}\\right]$\n\nFactoring the denominator in terms of $i\\omega$:\n\n\n$$12 + 7i\\omega - \\omega^2 = (i\\omega)^2 + 7(i\\omega) + 12 = (i\\omega + 3)(i\\omega + 4)$$\n\nSplitting into partial fractions:\n\n\n$$\\frac{1}{(i\\omega + 3)(i\\omega + 4)} = \\frac{1}{i\\omega + 3} - \\frac{1}{i\\omega + 4}$$\n\nFrom Question 5(i), we know:\n\n\n$$\\mathcal{F}\\{u_0(x)e^{-ax}\\} = \\frac{1}{\\sqrt{2\\pi}(a+i\\omega)} \\implies \\mathcal{F}^{-1}\\left[\\frac{1}{a+i\\omega}\\right] = \\sqrt{2\\pi}u_0(x)e^{-ax}$$\n\nApplying this for $a = 3$ and $a = 4$:\n\n\n$$f(x) = \\sqrt{2\\pi}u_0(x)e^{-3x} - \\sqrt{2\\pi}u_0(x)e^{-4x}$$\n\n$$\\boxed{f(x) = \\begin{cases} \\sqrt{2\\pi}(e^{-3x} - e^{-4x}), & x \\ge 0 \\\\ 0, & x < 0 \\end{cases}}$$\n\n---\n\n### Question 7\n\n**Given:** $\\hat{f}(\\omega) = \\frac{1}{1+\\omega^2}$\n\nFrom Question 5(ii) with $a = 1$:\n\n\n$$\\mathcal{F}\\{e^{-\\vert{}x\\vert{}}\\} = \\sqrt{\\frac{2}{\\pi}}\\frac{1}{1+\\omega^2}$$\n\nTaking the inverse on both sides:\n\n\n$$e^{-\\vert{}x\\vert{}} = \\sqrt{\\frac{2}{\\pi}}\\mathcal{F}^{-1}\\left[\\frac{1}{1+\\omega^2}\\right]$$\n\nRearranging for the inverse transform:\n\n\n$$\\boxed{f(x) = \\mathcal{F}^{-1}\\left[\\frac{1}{1+\\omega^2}\\right] = \\sqrt{\\frac{\\pi}{2}}e^{-\\vert{}x\\vert{}}}$$\n\n---\n\n### Question 8\n\n#### (a) $y'(x) - 4y(x) = u_0(x)e^{-4x}$\n\nTaking the Fourier transform across the equation:\n\n\n$$\\mathcal{F}\\{y'(x)\\} - 4\\mathcal{F}\\{y(x)\\} = \\mathcal{F}\\{u_0(x)e^{-4x}\\}$$\n\n$$(i\\omega - 4)\\hat{y}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\frac{1}{i\\omega + 4}$$\n\nSolving for $\\hat{y}(\\omega)$:\n\n\n$$\\hat{y}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\frac{1}{(i\\omega - 4)(i\\omega + 4)} = \\frac{1}{\\sqrt{2\\pi}}\\frac{1}{-\\omega^2 - 16} = -\\frac{1}{\\sqrt{2\\pi}}\\frac{1}{\\omega^2 + 16}$$\n\nInverting:\n\n\n$$y(x) = -\\frac{1}{\\sqrt{2\\pi}}\\mathcal{F}^{-1}\\left[\\frac{1}{\\omega^2 + 4^2}\\right]$$\n\nUsing $\\mathcal{F}^{-1}\\left[\\frac{a}{\\omega^2 + a^2}\\right] = \\sqrt{\\frac{\\pi}{2}}\\frac{1}{a}e^{-a\\vert{}x\\vert{}}$ with $a = 4$:\n\n\n$$\\mathcal{F}^{-1}\\left[\\frac{1}{\\omega^2 + 16}\\right] = \\frac{1}{4}\\sqrt{\\frac{\\pi}{2}}e^{-4\\vert{}x\\vert{}}$$\n\nThus:\n\n\n$$y(x) = -\\frac{1}{\\sqrt{2\\pi}}\\left(\\frac{1}{4}\\sqrt{\\frac{\\pi}{2}}e^{-4\\vert{}x\\vert{}}\\right) = \\boxed{-\\frac{1}{8}e^{-4\\vert{}x\\vert{}}}$$\n\n#### (b) $y''(x) + 3y'(x) + 2y(x) = \\delta(x-3)$\n\nTaking transforms of both sides:\n\n\n$$\\left[(i\\omega)^2 + 3(i\\omega) + 2\\right]\\hat{y}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\int_{-\\infty}^\\infty \\delta(x-3)e^{-i\\omega x}\\,dx = \\frac{1}{\\sqrt{2\\pi}}e^{-3i\\omega}$$\n\n$$(i\\omega + 1)(i\\omega + 2)\\hat{y}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}e^{-3i\\omega}$$\n\nLet $\\hat{y}(\\omega) = e^{-3i\\omega}\\hat{g}(\\omega)$, where:\n\n\n$$\\hat{g}(\\omega) = \\frac{1}{\\sqrt{2\\pi}}\\left[\\frac{1}{i\\omega + 1} - \\frac{1}{i\\omega + 2}\\right] \\implies g(x) = u_0(x)(e^{-x} - e^{-2x})$$\n\nBy the time-shift property $\\mathcal{F}^{-1}\\{e^{-3i\\omega}\\hat{g}(\\omega)\\} = g(x-3)$:\n\n\n$$\\boxed{y(x) = u_0(x-3)\\left[e^{-(x-3)} - e^{-2(x-3)}\\right] = \\begin{cases} e^{-(x-3)} - e^{-2(x-3)}, & x \\ge 3 \\\\ 0, & x < 3 \\end{cases}}$$\n\n---\n\n### Question 9\n\n**Given:** $f(x) = x^{n-1}$ for $x > 0$ and $0 < n < 1$.\n\nRecall the definition of the Gamma function:\n\n\n$$\\Gamma(n) = \\int_0^\\infty t^{n-1}e^{-t} \\, dt$$\n\nSubstituting $t = (k + i\\omega)x$ (where $k > 0$):\n\n\n$$\\int_0^\\infty x^{n-1}e^{-(k+i\\omega)x} \\, dx = \\frac{\\Gamma(n)}{(k+i\\omega)^n}$$\n\nTaking the limit as $k \\to 0^+$:\n\n\n$$\\int_0^\\infty x^{n-1}e^{-i\\omega x} \\, dx = \\frac{\\Gamma(n)}{(i\\omega)^n} = \\frac{\\Gamma(n)}{\\omega^n e^{i n\\pi / 2}} = \\frac{\\Gamma(n)}{\\omega^n}\\left[\\cos\\left(\\frac{n\\pi}{2}\\right) - i\\sin\\left(\\frac{n\\pi}{2}\\right)\\right]$$\n\nEquating real and imaginary parts:\n\n\n$$\\int_0^\\infty x^{n-1}\\cos(\\omega x) \\, dx = \\frac{\\Gamma(n)}{\\omega^n}\\cos\\left(\\frac{n\\pi}{2}\\right)$$\n\n$$\\int_0^\\infty x^{n-1}\\sin(\\omega x) \\, dx = \\frac{\\Gamma(n)}{\\omega^n}\\sin\\left(\\frac{n\\pi}{2}\\right)$$\n\nMultiplying by $\\sqrt{\\frac{2}{\\pi}}$ yields the Fourier Cosine and Sine transforms:\n\n\n$$\\boxed{\\hat{f}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{\\Gamma(n)}{\\omega^n}\\cos\\left(\\frac{n\\pi}{2}\\right)}, \\quad \\boxed{\\hat{f}_s(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{\\Gamma(n)}{\\omega^n}\\sin\\left(\\frac{n\\pi}{2}\\right)}$$\n\n**For $f(x) = \\frac{1}{\\sqrt{x}}$:**\nHere $n - 1 = -\\frac{1}{2} \\implies n = \\frac{1}{2}$.\nKnowing $\\Gamma(1/2) = \\sqrt{\\pi}$ and $\\cos(\\pi/4) = \\sin(\\pi/4) = \\frac{1}{\\sqrt{2}}$:\n\n\n$$\\hat{f}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{\\sqrt{\\pi}}{\\sqrt{\\omega}}\\left(\\frac{1}{\\sqrt{2}}\\right) = \\boxed{\\frac{1}{\\sqrt{\\omega}}}$$\n\n$$\\hat{f}_s(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{\\sqrt{\\pi}}{\\sqrt{\\omega}}\\left(\\frac{1}{\\sqrt{2}}\\right) = \\boxed{\\frac{1}{\\sqrt{\\omega}}}$$\n\n---\n\n### Question 10\n\nParseval's identity for the Fourier cosine transform:\n\n\n$$\\int_0^\\infty \\hat{f}_c(\\omega)\\hat{g}_c(\\omega) \\, d\\omega = \\int_0^\\infty f(x)g(x) \\, dx$$\n\n#### (i) Evaluate $\\int_0^\\infty \\frac{dx}{(a^2+x^2)(b^2+x^2)}$\n\nLet $f(x) = e^{-ax}$ and $g(x) = e^{-bx}$. Their cosine transforms are:\n\n\n$$\\hat{f}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{a}{a^2+\\omega^2}, \\quad \\hat{g}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{b}{b^2+\\omega^2}$$\n\nApplying Parseval's identity:\n\n\n$$\\int_0^\\infty \\left(\\sqrt{\\frac{2}{\\pi}}\\frac{a}{a^2+\\omega^2}\\right)\\left(\\sqrt{\\frac{2}{\\pi}}\\frac{b}{b^2+\\omega^2}\\right) \\, d\\omega = \\int_0^\\infty e^{-(a+b)x} \\, dx$$\n\n$$\\frac{2ab}{\\pi}\\int_0^\\infty \\frac{d\\omega}{(a^2+\\omega^2)(b^2+\\omega^2)} = \\frac{1}{a+b}$$\n\nRearranging:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{dx}{(a^2+x^2)(b^2+x^2)} = \\frac{\\pi}{2ab(a+b)}}$$\n\n#### (ii) Evaluate $\\int_0^\\infty \\frac{\\sin ax}{x(a^2+x^2)} \\, dx$\n\nLet $f(x) = \\begin{cases} 1, & 0 < x < a \\\\ 0, & x > a \\end{cases}$ and $g(x) = e^{-ax}$.\nTheir cosine transforms are:\n\n\n$$\\hat{f}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{\\sin(a\\omega)}{\\omega}, \\quad \\hat{g}_c(\\omega) = \\sqrt{\\frac{2}{\\pi}}\\frac{a}{a^2+\\omega^2}$$\n\nApplying Parseval's identity:\n\n\n$$\\frac{2a}{\\pi}\\int_0^\\infty \\frac{\\sin(a\\omega)}{\\omega(a^2+\\omega^2)} \\, d\\omega = \\int_0^a e^{-ax} \\, dx = \\left[-\\frac{e^{-ax}}{a}\\right]_0^a = \\frac{1 - e^{-a^2}}{a}$$\n\nSolving for the integral and swapping the dummy variable to $x$:\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\sin ax}{x(a^2+x^2)} \\, dx = \\frac{\\pi(1 - e^{-a^2})}{2a^2}}$$\n\n---\n\n### Question 11\n\n**Goal:** Show $\\int_0^\\infty \\frac{\\cos(\\omega x)}{x^2+1} \\, dx = \\frac{\\pi}{2}e^{-\\omega}$ for $\\omega \\ge 0$.\n\nLet $f(x) = e^{-x}$ for $x \\ge 0$. Its Fourier cosine representation is:\n\n\n$$f(x) = \\frac{2}{\\pi}\\int_0^\\infty \\left[\\int_0^\\infty e^{-t}\\cos(\\omega t) \\, dt\\right]\\cos(\\omega x) \\, d\\omega$$\n\nEvaluating inner integral:\n\n\n$$\\int_0^\\infty e^{-t}\\cos(\\omega t) \\, dt = \\frac{1}{1+\\omega^2}$$\n\nSubstitute back:\n\n\n$$e^{-x} = \\frac{2}{\\pi}\\int_0^\\infty \\frac{\\cos(\\omega x)}{1+\\omega^2} \\, d\\omega \\implies \\int_0^\\infty \\frac{\\cos(\\omega x)}{1+\\omega^2} \\, d\\omega = \\frac{\\pi}{2}e^{-x}$$\n\nNow swap the roles of $x$ and $\\omega$ (interchanging variable names):\n\n\n$$\\boxed{\\int_0^\\infty \\frac{\\cos(\\omega x)}{x^2+1} \\, dx = \\frac{\\pi}{2}e^{-\\omega}, \\quad \\omega \\ge 0} \\quad \\text{Q.E.D.}$$\n\n---\n\n### Question 12\n\n#### (a) Inverse Sine Transform of $\\hat{f}_s(\\omega) = \\begin{cases} 1-\\omega, & \\omega \\le 1 \\\\ 0, & \\omega > 1 \\end{cases}$\n\n$$f(x) = \\sqrt{\\frac{2}{\\pi}}\\int_0^1 (1-\\omega)\\sin(\\omega x) \\, d\\omega$$\n\nIntegrating by parts with $u = 1-\\omega, dv = \\sin(\\omega x)d\\omega$:\n\n\n$$\\int_0^1 (1-\\omega)\\sin(\\omega x) \\, d\\omega = \\left[-(1-\\omega)\\frac{\\cos(\\omega x)}{x}\\right]_0^1 - \\frac{1}{x}\\int_0^1 \\cos(\\omega x) \\, d\\omega$$\n\n$$= \\frac{1}{x} - \\frac{\\sin x}{x^2} = \\frac{x - \\sin x}{x^2}$$\n\nHence:\n\n\n$$\\boxed{f(x) = \\sqrt{\\frac{2}{\\pi}}\\left(\\frac{x - \\sin x}{x^2}\\right)}$$\n\n#### (b) Inverse Cosine Transform of $\\hat{f}_c(\\omega) = e^{-\\frac{\\omega^2}{2}} + \\frac{4}{\\omega^2+4}$\n\nBy linearity:\n\n\n$$f(x) = \\mathcal{F}_c^{-1}\\left\\{e^{-\\frac{\\omega^2}{2}}\\right\\} + \\mathcal{F}_c^{-1}\\left\\{\\frac{4}{\\omega^2+4}\\right\\}$$\n\n* **First term:** Since $e^{-x^2/2}$ is self-reciprocal under the cosine transform,\n\n$$\\mathcal{F}_c^{-1}\\left\\{e^{-\\frac{\\omega^2}{2}}\\right\\} = e^{-\\frac{x^2}{2}}$$\n\n\n* **Second term:** Recall $\\mathcal{F}_c\\{e^{-2x}\\} = \\sqrt{\\frac{2}{\\pi}}\\frac{2}{\\omega^2+4}$. Thus:\n\n$$\\frac{4}{\\omega^2+4} = \\sqrt{2\\pi}\\left(\\sqrt{\\frac{2}{\\pi}}\\frac{2}{\\omega^2+4}\\right) \\implies \\mathcal{F}_c^{-1}\\left\\{\\frac{4}{\\omega^2+4}\\right\\} = \\sqrt{2\\pi}e^{-2x}$$\n\n\n\nCombining both parts:\n\n\n$$\\boxed{f(x) = e^{-\\frac{x^2}{2}} + \\sqrt{2\\pi}e^{-2x}, \\quad x \\ge 0}$$\n\n[ROUGH_WORK]\n(i\u03c9 + 3)(i\u03c9 + 4) = (i\u03c9)^2 + 7i\u03c9 + 12 = -\u03c9^2 + 7i\u03c9 + 12  [Check Q6 factoring]\n(\u03c9^2 + 2)^2 - (2\u03c9)^2 = \u03c9^4 + 4\u03c9^2 + 4 - 4\u03c9^2 = \u03c9^4 + 4   [Check Q3 denominator]\n-(1/sqrt(2pi)) * (1/4) * sqrt(pi/2) = -(1/4) * (1/2) = -1/8 [Check Q8(a) scalar constant]\nsqrt(2/pi) * sqrt(pi) * (1/sqrt(2)) = sqrt(2/2) = 1      [Check Q9 1/sqrt(x) transform]\n1/a - e^(-a^2)/a = (1 - e^(-a^2))/a                      [Check Q10(ii) limits at 0 and a]",
  },
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
`
  },
  {
    id: 'bisection-root',
    title: 'Numerical Methods: Bisection Root Finding (Indian College Assignment)',
    description: 'Interval continuity check, sign changes, iterative bisection table, and boxed root.',
    content: `# Numerical Analysis & Computation
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
