import React from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./header.module.css";
import logo from "/imgs/Logo Aboa 1.png";

const USER_LOCATION_KEY = "aboa:userLocation";

export default function Header() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario")
    ? JSON.parse(localStorage.getItem("usuario"))
    : null;

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    sessionStorage.removeItem(USER_LOCATION_KEY);
    navigate("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>

        {/* Logo */}
        <div className={styles.headerLeft}>
          <Link to="/">
            <img src={logo} alt="ABOA" className={styles.headerLogo} />
          </Link>
        </div>

        {/* Links da direita */}
        <div className={styles.authLinks}>
          {!token ? (
            <>
              <Link to="/cadastro">Crie sua conta</Link>
              {" | "}
              <Link to="/login">Login</Link>
            </>
          ) : (
            <>
              {/* Saudação */}
              <span className={styles.welcome}>
                Olá, {usuario?.nome?.split(" ")[0]}!
              </span>

              {usuario?.tipo === "user" ? (
                <Link to="/minha-conta-usuario">Minha Conta</Link>
              ) : (
                <Link to="/minha-conta-rest">Minha Conta</Link>
              )}

              {/* Cadastrar Estabelecimento → apenas para usuários normais */}
              {usuario?.tipo === "user" && (
                <Link to="/cadastro-estabelecimento">
                  Cadastrar Estabelecimento
                </Link>
              )}

              {/* Logout */}
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
