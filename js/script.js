const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const statusLineEl = document.getElementById("statusLine");
const modeIndicatorEl = document.getElementById("modeIndicator");
const memoryIndicatorEl = document.getElementById("memoryIndicator");
const buttonGrid = document.getElementById("buttonGrid");
const calculatorCard = document.getElementById("calculatorCard");
const themeToggle = document.getElementById("themeToggle");

const operators = new Set(["+", "-", "*", "/", "%", "^", "u-", "!"]);
const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3, "u-": 4, "!": 5 };
const rightAssociative = new Set(["^", "u-"]);
const functions = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "log", "ln", "sqrt", "cbrt", "abs", "exp"]);
const maxLength = 150;
const state = {
    expression: "",
    result: "0",
    isError: false,
    ans: 0,
    memory: 0,
    angleMode: "DEG",
    status: "Ready"
};

function setStatus(text) {
    state.status = text;
    statusLineEl.textContent = text;
}

function roundOutput(value) {
    if (!Number.isFinite(value)) throw new Error("Math Error");
    return Number(value.toPrecision(12));
}

function updateDisplay(withAnimation = true) {
    expressionEl.textContent = state.expression || "0";
    displayEl.textContent = state.result || "0";
    modeIndicatorEl.textContent = state.angleMode;
    memoryIndicatorEl.textContent = `M:${Number(state.memory.toPrecision(6))}`;
    if (withAnimation) {
        displayEl.classList.remove("update");
        requestAnimationFrame(() => displayEl.classList.add("update"));
        setTimeout(() => displayEl.classList.remove("update"), 180);
    }
    highlightActiveOperator();
}

function appendValue(value) {
    if (state.isError) {
        state.expression = "";
        state.result = "0";
        state.isError = false;
        setStatus("Ready");
    }
    if (state.expression.length >= maxLength) return;

    const lastChar = state.expression.slice(-1);
    const isBinaryOp = ["+", "-", "*", "/", "%", "^"].includes(value);

    if (isBinaryOp) {
        if (!state.expression && value !== "-") return;
        if (["+", "-", "*", "/", "%", "^"].includes(lastChar)) {
            state.expression = state.expression.slice(0, -1) + value;
        } else {
            state.expression += value;
        }
    } else if (value === "Exp") {
        state.expression += "E";
    } else if (value === "x^2") {
        state.expression += "^2";
    } else if (value === "x^3") {
        state.expression += "^3";
    } else if (value === "1/x") {
        state.expression += "1/(";
    } else if (value === "n!") {
        state.expression += "!";
    } else if (value === ".") {
        const currentChunk = state.expression.match(/([0-9.E]+)$/)?.[0] || "";
        if (currentChunk.includes(".")) return;
        state.expression += currentChunk ? "." : "0.";
    } else {
        state.expression += value;
    }
    state.result = state.expression || "0";
    updateDisplay();
}

function clearAll() {
    state.expression = "";
    state.result = "0";
    state.isError = false;
    setStatus("Cleared");
    updateDisplay();
}

function deleteLast() {
    if (state.isError) {
        clearAll();
        return;
    }
    state.expression = state.expression.slice(0, -1);
    state.result = state.expression || "0";
    setStatus("Deleted");
    updateDisplay();
}

function tokenize(expression) {
    const compact = expression.replace(/\s+/g, "");
    if (!compact) throw new Error("Empty expression");
    const tokens = [];
    let i = 0;
    while (i < compact.length) {
        const char = compact[i];
        const nextChunk = compact.slice(i);

        const fnMatch = nextChunk.match(/^(asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|log|ln|sqrt|cbrt|abs|exp)/);
        if (fnMatch) {
            tokens.push(fnMatch[0]);
            i += fnMatch[0].length;
            continue;
        }

        if (nextChunk.startsWith("Ans")) {
            tokens.push(String(state.ans));
            i += 3;
            continue;
        }

        if (char === "p" && compact.slice(i, i + 2) === "pi") {
            tokens.push(String(Math.PI));
            i += 2;
            continue;
        }

        if (char === "e") {
            tokens.push(String(Math.E));
            i += 1;
            continue;
        }

        if (/[0-9.]/.test(char)) {
            let number = char;
            i += 1;
            while (i < compact.length && /[0-9.Ee]/.test(compact[i])) {
                number += compact[i];
                i += 1;
            }
            if ((number.match(/\./g) || []).length > 1) throw new Error("Syntax Error");
            if (/[Ee]$/.test(number)) throw new Error("Syntax Error");
            tokens.push(number);
            continue;
        }

        if ("()+-*/%^!".includes(char)) {
            tokens.push(char);
            i += 1;
            continue;
        }

        throw new Error("Syntax Error");
    }
    return tokens;
}

function toRpn(tokens) {
    const output = [];
    const stack = [];
    let previousType = "start";

    tokens.forEach((token) => {
        if (!Number.isNaN(Number(token))) {
            if (Number.isNaN(Number(token))) throw new Error("Invalid number");
            output.push(token);
            previousType = "number";
            return;
        }

        if (functions.has(token)) {
            stack.push(token);
            previousType = "function";
            return;
        }

        if (token === "(") {
            stack.push(token);
            previousType = "leftParen";
            return;
        }

        if (token === ")") {
            while (stack.length && stack[stack.length - 1] !== "(") {
                output.push(stack.pop());
            }
            if (!stack.length) throw new Error("Syntax Error");
            stack.pop();
            if (stack.length && functions.has(stack[stack.length - 1])) {
                output.push(stack.pop());
            }
            previousType = "rightParen";
            return;
        }

        if (token === "!") {
            output.push("!");
            previousType = "postfix";
            return;
        }

        if (!["+","-","*","/","%","^"].includes(token)) throw new Error("Syntax Error");
        const opToken = token === "-" && (previousType === "start" || previousType === "operator" || previousType === "leftParen")
            ? "u-"
            : token;

        while (
            stack.length &&
            operators.has(stack[stack.length - 1]) &&
            (
                (!rightAssociative.has(opToken) && precedence[stack[stack.length - 1]] >= precedence[opToken]) ||
                (rightAssociative.has(opToken) && precedence[stack[stack.length - 1]] > precedence[opToken])
            )
        ) {
            output.push(stack.pop());
        }
        stack.push(opToken);
        previousType = "operator";
    });

    while (stack.length) {
        const top = stack.pop();
        if (top === "(" || top === ")") throw new Error("Syntax Error");
        output.push(top);
    }
    return output;
}

function factorial(value) {
    if (value < 0 || !Number.isInteger(value)) throw new Error("Math Error");
    if (value > 170) throw new Error("Math Error");
    let result = 1;
    for (let i = 2; i <= value; i += 1) result *= i;
    return result;
}

function toRadians(value) {
    return state.angleMode === "DEG" ? value * (Math.PI / 180) : value;
}

function fromRadians(value) {
    return state.angleMode === "DEG" ? value * (180 / Math.PI) : value;
}

function calculateRpn(rpn) {
    const stack = [];
    rpn.forEach((token) => {
        if (!Number.isNaN(Number(token))) {
            stack.push(Number(token));
            return;
        }

        if (token === "u-") {
            const value = stack.pop();
            if (value === undefined) throw new Error("Syntax Error");
            stack.push(-value);
            return;
        }

        if (token === "!") {
            const value = stack.pop();
            if (value === undefined) throw new Error("Syntax Error");
            stack.push(factorial(value));
            return;
        }

        if (functions.has(token)) {
            const value = stack.pop();
            if (value === undefined) throw new Error("Syntax Error");

            let resultValue = 0;
            if (token === "sin") resultValue = Math.sin(toRadians(value));
            if (token === "cos") resultValue = Math.cos(toRadians(value));
            if (token === "tan") resultValue = Math.tan(toRadians(value));
            if (token === "asin") resultValue = fromRadians(Math.asin(value));
            if (token === "acos") resultValue = fromRadians(Math.acos(value));
            if (token === "atan") resultValue = fromRadians(Math.atan(value));
            if (token === "sinh") resultValue = Math.sinh(value);
            if (token === "cosh") resultValue = Math.cosh(value);
            if (token === "tanh") resultValue = Math.tanh(value);
            if (token === "log") {
                if (value <= 0) throw new Error("Math Error");
                resultValue = Math.log10(value);
            }
            if (token === "ln") {
                if (value <= 0) throw new Error("Math Error");
                resultValue = Math.log(value);
            }
            if (token === "sqrt") {
                if (value < 0) throw new Error("Math Error");
                resultValue = Math.sqrt(value);
            }
            if (token === "cbrt") resultValue = Math.cbrt(value);
            if (token === "abs") resultValue = Math.abs(value);
            if (token === "exp") resultValue = Math.exp(value);
            if (!Number.isFinite(resultValue)) throw new Error("Math Error");
            stack.push(resultValue);
            return;
        }

        const right = stack.pop();
        const left = stack.pop();
        if (left === undefined || right === undefined) throw new Error("Syntax Error");

        let resultValue = 0;
        if (token === "+") resultValue = left + right;
        if (token === "-") resultValue = left - right;
        if (token === "*") resultValue = left * right;
        if (token === "/") {
            if (right === 0) throw new Error("Math Error");
            resultValue = left / right;
        }
        if (token === "%") {
            if (right === 0) throw new Error("Math Error");
            resultValue = left % right;
        }
        if (token === "^") resultValue = left ** right;

        if (!Number.isFinite(resultValue)) throw new Error("Math Error");
        stack.push(resultValue);
    });

    if (stack.length !== 1) throw new Error("Syntax Error");
    return stack[0];
}

function evaluateExpression() {
    if (!state.expression) return;
    try {
        const tokens = tokenize(state.expression);
        const rpn = toRpn(tokens);
        const calculated = calculateRpn(rpn);
        const formatted = roundOutput(calculated);
        state.result = String(formatted);
        state.expression = state.result;
        state.ans = formatted;
        state.isError = false;
        setStatus("OK");
    } catch (error) {
        state.result = error.message === "Math Error" ? "Math Error" : "Syntax Error";
        state.isError = true;
        setStatus(state.result);
    }
    updateDisplay();
}

function createRipple(event, button) {
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(button.clientWidth, button.clientHeight);
    const rect = button.getBoundingClientRect();

    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
}

function highlightActiveOperator() {
    const lastChar = state.expression.match(/[+\-*/%^]$/)?.[0] || "";
    document.querySelectorAll(".calc-btn.operator").forEach((button) => {
        if (button.dataset.value === lastChar) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });
}

function applyTheme(savedTheme) {
    const isLight = savedTheme === "light";
    document.body.classList.toggle("light", isLight);
    themeToggle.textContent = isLight ? "🌙" : "☀";
}

function appendAns() {
    appendValue(String(state.ans));
}

function toggleAngleMode() {
    state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
    setStatus(`Mode: ${state.angleMode}`);
    updateDisplay(false);
}

function memoryAdd(isSubtract = false) {
    const value = Number(state.result);
    if (Number.isNaN(value)) return;
    state.memory = isSubtract ? state.memory - value : state.memory + value;
    setStatus(isSubtract ? "M-" : "M+");
    updateDisplay(false);
}

function memoryRecall() {
    appendValue(String(roundOutput(state.memory)));
    setStatus("MR");
}

function memoryClear() {
    state.memory = 0;
    setStatus("MC");
    updateDisplay(false);
}

function handleButtonClick(event) {
    const button = event.target.closest(".calc-btn");
    if (!button) return;

    button.classList.add("pressed");
    setTimeout(() => button.classList.remove("pressed"), 120);
    createRipple(event, button);

    const { value, action } = button.dataset;
    if (value) appendValue(value);
    if (action === "clear") clearAll();
    if (action === "delete") deleteLast();
    if (action === "toggle-angle") toggleAngleMode();
    if (action === "ans") appendAns();
    if (action === "memory-plus") memoryAdd(false);
    if (action === "memory-minus") memoryAdd(true);
    if (action === "memory-recall") memoryRecall();
    if (action === "memory-clear") memoryClear();
    if (action === "random") appendValue(String(roundOutput(Math.random())));
    if (action === "equals") evaluateExpression();
}

function handleKeyboard(event) {
    const key = event.key;
    if (/[\d+\-*/%.()^]/.test(key)) {
        appendValue(key);
        return;
    }
    if (key === "Enter" || key === "=") {
        event.preventDefault();
        evaluateExpression();
    }
    if (key === "Backspace") deleteLast();
    if (key === "Escape") clearAll();
    if (key.toLowerCase() === "a") appendAns();
    if (key.toLowerCase() === "m") toggleAngleMode();
}

function enableTiltEffect() {
    calculatorCard.addEventListener("mousemove", (event) => {
        const rect = calculatorCard.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        calculatorCard.style.setProperty("--tilt-x", `${-y * 6}deg`);
        calculatorCard.style.setProperty("--tilt-y", `${x * 8}deg`);
    });

    calculatorCard.addEventListener("mouseleave", () => {
        calculatorCard.style.setProperty("--tilt-x", "0deg");
        calculatorCard.style.setProperty("--tilt-y", "0deg");
    });
}

buttonGrid.addEventListener("click", handleButtonClick);
document.addEventListener("keydown", handleKeyboard);

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
    applyTheme(nextTheme);
    localStorage.setItem("calculatorTheme", nextTheme);
});

applyTheme(localStorage.getItem("calculatorTheme") || "dark");
enableTiltEffect();
setStatus("Ready");
updateDisplay(false);