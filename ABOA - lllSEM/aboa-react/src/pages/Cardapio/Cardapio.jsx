import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./Cardapio.module.css";
import Header from "../../components/Header.jsx";
import { API_URL } from "../../config/api.js";

export default function Cardapio() {
  const location = useLocation();
  const restaurante = location.state?.restaurante;

  const [itens, setItens] = useState([]);
  const [filtrado, setFiltrado] = useState([]);
  const [categoria, setCategoria] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      console.log("REST:", restaurante); // <<< TESTE 1

      if (!restaurante?._id) {
        console.log("SEM ID DO RESTAURANTE!");
        return;
      }

      try {
        console.log("Buscando:", `${API_URL}/api/cardapio/por-restaurante/${restaurante.donoId}`);

        const resp = await fetch(
          `${API_URL}/api/cardapio/por-restaurante/${restaurante.donoId}`
        );

        console.log("STATUS:", resp.status); // <<< TESTE 2

        const data = await resp.json();
        console.log("DATA:", data); // <<< TESTE 3

        const normalizados = data.map((i) => ({
          ...i,
          disponivel: i.disponivel === true || i.disponivel === "true",
          emPromocao: i.emPromocao === true || i.emPromocao === "true",
        }));

        setItens(normalizados);
        setFiltrado(normalizados);
        setLoading(false);
      } catch (err) {
        console.log("ERRO AO PUXAR CARDÁPIO:", err); // <<< TESTE 4
      }
    }

    carregar();
  }, []);

  // -----------------------------------------
  // FILTRAR POR CATEGORIA
  // -----------------------------------------
  function filtrar(tipo) {
    setCategoria(tipo);

    if (tipo === "todos") {
      setFiltrado(itens);
      return;
    }

    setFiltrado(itens.filter((i) => i.tipo === tipo));
  }

  if (!restaurante) {
    return <p>Erro: nenhum restaurante informado.</p>;
  }

  return (
    <div className={styles.pageWrapper}>
      <Header />

      <div className={styles.topo}>
        <img
          src={`${API_URL}${restaurante.fotoUrl}`}
          alt={restaurante.nome}
          className={styles.fotoPerfil}
        />

        <div className={styles.infoRestaurante}>
          <h1>{restaurante.nome}</h1>
          <p className={styles.desc}>{restaurante.descricao}</p>
        </div>
      </div>

      {/* FILTRO */}
      <div className={styles.filtroBox}>
        <button
          onClick={() => filtrar("todos")}
          className={categoria === "todos" ? styles.ativo : ""}
        >
          Todos
        </button>

        <button
          onClick={() => filtrar("principal")}
          className={categoria === "principal" ? styles.ativo : ""}
        >
          Principais
        </button>

        <button
          onClick={() => filtrar("acompanhamento")}
          className={categoria === "acompanhamento" ? styles.ativo : ""}
        >
          Acompanhamentos
        </button>

        <button
          onClick={() => filtrar("bebida")}
          className={categoria === "bebida" ? styles.ativo : ""}
        >
          Bebidas
        </button>

        <button
          onClick={() => filtrar("sobremesa")}
          className={categoria === "sobremesa" ? styles.ativo : ""}
        >
          Sobremesas
        </button>
      </div>

      {/* LISTA */}
      <div className={styles.container}>
        {loading ? (
          <p>Carregando...</p>
        ) : filtrado.length === 0 ? (
          <p className={styles.nenhumItem}>Nenhum item nessa categoria.</p>
        ) : (
          <div className={styles.listagem}>
            {filtrado.map((item) => (
              <div key={item._id} className={styles.card}>

                {/* PROMOÇÃO */}
                {item.emPromocao && (
                  <span className={styles.saleTag}>Promoção</span>
                )}

                <img
                  src={`${API_URL}${item.fotoUrl}`}
                  alt={item.nome}
                  className={styles.fotoItem}
                />

                <h3>{item.nome}</h3>
                <p className={styles.txtDesc}>{item.descricao}</p>

                {/* DISPONIBILIDADE */}
                {item.disponivel ? (
                  <span className={styles.disponivel}>Disponível</span>
                ) : (
                  <span className={styles.indisponivel}>Indisponível</span>
                )}

                {/* PREÇOS */}
                {item.emPromocao ? (
                  <>
                    <p className={styles.oldPrice}>R$ {item.preco}</p>
                    <p className={styles.newPrice}>
                      R$ {item.precoPromocional}
                    </p>
                    <p className={styles.promoText}>{item.textoPromocao}</p>
                  </>
                ) : (
                  <p className={styles.preco}>R$ {item.preco}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
