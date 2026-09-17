import { auth, googleProvider } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
  sendPasswordResetEmail, updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { bindShell, toast } from "./ui.js";

bindShell();
let mode = "login";
const form = document.querySelector("#auth-form");
const title = document.querySelector("#auth-title");
const subtitle = document.querySelector("#auth-subtitle");
const nameField = document.querySelector("#name-field");
const submit = document.querySelector("#auth-submit");
const switchBtn = document.querySelector("#switch-mode");
const resetBtn = document.querySelector("#reset-password");

function paint() {
  const signup = mode === "signup";
  title.textContent = signup ? "Criar sua conta" : "Bem-vindo de volta";
  subtitle.textContent = signup ? "Crie sua conta Flux Blue em segundos." : "Entre para acessar suas compras.";
  nameField.hidden = !signup;
  submit.textContent = signup ? "Criar conta" : "Entrar";
  switchBtn.textContent = signup ? "Já tenho conta" : "Criar uma conta";
}

switchBtn.onclick = () => { mode = mode === "login" ? "signup" : "login"; paint(); };

document.querySelector("#google-login").onclick = async () => {
  try { await signInWithPopup(auth, googleProvider); location.href = "./conta.html"; }
  catch (e) { toast(e.message, "error"); }
};

form.onsubmit = async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  try {
    if (mode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const name = form.name.value.trim();
      if (name) await updateProfile(cred.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    location.href = "./conta.html";
  } catch (e2) { toast(e2.message, "error"); }
};

resetBtn.onclick = async () => {
  const email = form.email.value.trim();
  if (!email) return toast("Digite seu e-mail primeiro.", "error");
  try { await sendPasswordResetEmail(auth, email); toast("E-mail de recuperação enviado.", "success"); }
  catch (e) { toast(e.message, "error"); }
};

onAuthStateChanged(auth, (user) => { if (user && new URLSearchParams(location.search).get("force") !== "1") {} });
paint();
