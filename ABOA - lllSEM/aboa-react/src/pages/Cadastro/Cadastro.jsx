import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./cadastro.module.css";
import { API_URL } from "../../config/api.js";

export default function Cadastro() {
  const navigate = useNavigate();

  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCadastro(e) {
    e.preventDefault();
    setErro("");

    const form = e.target;

    const nome = form.nome.value;
    const email = form.email.value;
    const senha = form.senha.value;
    const confirmar = form.confirmar.value;
    const aceitouTermos = form.termos.checked;

    // validação simples
    if (!aceitouTermos) {
      setErro("Você precisa aceitar os Termos de Uso para continuar.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          senha,
        }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErro(json.erro || "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      // salvar token e usuário
      localStorage.setItem("token", json.token);
      localStorage.setItem("usuario", JSON.stringify(json.usuario));

      setLoading(false);

      // redirecionar após cadastro
      navigate("/");

    } catch (error) {
      setErro("Erro de conexão com o servidor.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.cadastroWrapper}>

      {/* LADO ESQUERDO */}
      <div className={styles.leftSide}>
        <img
          src="/imgs/Logo Aboa 1.png"
          alt="Logo ABOA"
          className={styles.logo}
        />

        <h1 className={styles.title}>Crie sua conta</h1>
        <p className={styles.subtitle}>
          Comece a descobrir os melhores lugares perto de você
        </p>

        <form className={styles.form} onSubmit={handleCadastro}>

          <label>Nome completo</label>
          <input name="nome" type="text" placeholder="Digite seu nome completo" required />

          <label>E-mail</label>
          <input name="email" type="email" placeholder="Digite seu e-mail" required />

          <label>Senha</label>
          <input name="senha" type="password" placeholder="Crie uma senha" required />

          <label>Confirmar senha</label>
          <input name="confirmar" type="password" placeholder="Confirme sua senha" required />

          {erro && (
            <p style={{ color: "yellow", marginTop: "5px", textAlign: "center" }}>
              {erro}
            </p>
          )}

          <div className={styles.checkboxRow}>
            <input type="checkbox" id="termos" name="termos" />
            <label htmlFor="termos">
              Concordo com os <a href="#">Termos de Uso</a> e{" "}
              <a href="#">Política de Privacidade</a>
            </label>
          </div>

          <button className={styles.btnCadastro} disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div className={styles.links}>
          <p>
            Já tem uma conta? <a href="/login">Faça login</a>
          </p>
        </div>
      </div>

      {/* LADO DIREITO COM WALLPAPER */}
      <div className={styles.rightSide}></div>
    </div>
  );
}
