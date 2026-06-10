import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import { API_URL } from "../../config/api.js";

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    const form = e.target;
    const email = form.email.value;
    const senha = form.senha.value;

    try {
      const resp = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErro(json.erro || "Credenciais inválidas");
        setLoading(false);
        return;
      }

      // salvar no navegador
      localStorage.setItem("token", json.token);
      localStorage.setItem("usuario", JSON.stringify(json.usuario));

      setLoading(false);

      // redirecionar
      navigate("/"); // <-- ajuste se quiser outra rota

    } catch (error) {
      setErro("Erro de conexão com o servidor.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginWrapper}>

      {/* Wallpaper */}
      <div className={styles.wallpaper}></div>

      {/* Bloco laranja */}
      
      <div className={styles.circleSection}>
     
        <h1 className={styles.logo}>
          <img src="/imgs/Logo Aboa 1.png" alt="ABOA" />
        </h1>
            <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />

        <div className={styles.circleContent}>
          <h2>A gente já sabe onde é a boa, só falta você entrar!</h2>

          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input name="email" type="email" placeholder="Digite seu email" required />
            </div>

            <div className={styles.formGroup}>
              <label>Senha</label>
              <input name="senha" type="password" placeholder="Digite sua senha" required />
            </div>

            {erro && (
              <p style={{ color: "yellow", marginTop: "-10px" }}>{erro}</p>
            )}

            <button className={styles.loginButton} disabled={loading}>
              {loading ? "Entrando..." : "Login"}
            </button>
          </form>

          <div className={styles.links}>
            
            <a href="/cadastro">Ainda não tem conta?</a>
          </div>
        </div>
      </div>
    </div>
  );
}
