import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./recomenda_nova.module.css";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { API_URL } from "../../config/api.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const RAIO_KM = 10;
const USER_LOCATION_KEY = "aboa:userLocation";

const userIcon = L.divIcon({
  className: styles.routeUserPin,
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const destinationIcon = L.divIcon({
  className: styles.routeDestinationPin,
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function formatarDistancia(distanciaKm) {
  if (typeof distanciaKm !== "number") return null;

  if (distanciaKm < 1) {
    return `${Math.round(distanciaKm * 1000)} m`;
  }

  return `${distanciaKm.toLocaleString("pt-BR", {
    maximumFractionDigits: 1
  })} km`;
}

function lerLocalizacaoSalva() {
  const salvo = sessionStorage.getItem(USER_LOCATION_KEY);
  if (!salvo) return null;

  try {
    const dados = JSON.parse(salvo);
    const lat = Number(dados.lat);
    const lng = Number(dados.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    return null;
  }
}

function getCoordenadasRestaurante(restaurante) {
  const coords = restaurante?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function formatarTempo(segundos) {
  if (typeof segundos !== "number") return null;

  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function montarUrlGoogleMaps(restaurante) {
  const destino = getCoordenadasRestaurante(restaurante);

  if (destino) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    restaurante.endereco
  )}`;
}

export default function Recomenda() {
  const query = useQuery();
  const termoBusca = query.get("q") || "";

  const [destaque, setDestaque] = useState(null);
  const [outras, setOutras] = useState([]);
  const [posicaoUsuario, setPosicaoUsuario] = useState(null);
  const [modalRota, setModalRota] = useState(null);
  const [rota, setRota] = useState(null);
  const [mensagemRota, setMensagemRota] = useState("");
  const [carregandoRota, setCarregandoRota] = useState(false);
  const navigate = useNavigate();

  function comLocalizacao(url) {
    if (!posicaoUsuario) return url;

    const separador = url.includes("?") ? "&" : "?";

    return `${url}${separador}lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}&raioKm=${RAIO_KM}`;
  }

  async function buscar(termo) {
    const resp = await fetch(
      comLocalizacao(
        `${API_URL}/api/estabelecimentos/buscar?q=${encodeURIComponent(
          termo
        )}`
      )
    );
    const data = await resp.json();

    if (data.length === 0) {
      setDestaque(null);
      setOutras([]);
      return;
    }

    setDestaque(data[0]);
    setOutras(data.slice(1, 4)); // só 3
  }

  async function carregarTodos() {
    const resp = await fetch(
      comLocalizacao(`${API_URL}/api/estabelecimentos`)
    );
    const data = await resp.json();

    setDestaque(data[0] || null);
    setOutras(data.slice(1, 4));
  }

  async function abrirRota(restaurante) {
    const origem = posicaoUsuario || lerLocalizacaoSalva();
    const destino = getCoordenadasRestaurante(restaurante);

    if (!origem || !destino) {
      window.open(montarUrlGoogleMaps(restaurante), "_blank", "noopener,noreferrer");
      return;
    }

    setModalRota({ restaurante, origem, destino });
    setRota(null);
    setMensagemRota("");
    setCarregandoRota(true);

    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson&steps=false`
      );
      const data = await resp.json();
      const melhorRota = data?.routes?.[0];

      if (!resp.ok || !melhorRota?.geometry?.coordinates) {
        setMensagemRota("Não foi possível traçar a rota agora.");
        return;
      }

      setRota({
        distanciaKm: melhorRota.distance / 1000,
        duracaoSegundos: melhorRota.duration,
        pontos: melhorRota.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      });
    } catch (err) {
      setMensagemRota("Não foi possível traçar a rota agora.");
    } finally {
      setCarregandoRota(false);
    }
  }

  function iniciarRota() {
    if (!modalRota?.restaurante) return;

    window.open(
      montarUrlGoogleMaps(modalRota.restaurante),
      "_blank",
      "noopener,noreferrer"
    );
  }

  useEffect(() => {
    const localizacaoSalva = lerLocalizacaoSalva();
    if (localizacaoSalva) {
      setPosicaoUsuario(localizacaoSalva);
      return;
    }

    if (sessionStorage.getItem(USER_LOCATION_KEY) || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const localizacao = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        sessionStorage.setItem(
          USER_LOCATION_KEY,
          JSON.stringify({
            ...localizacao,
            accuracy: pos.coords.accuracy,
            updatedAt: Date.now()
          })
        );

        setPosicaoUsuario(localizacao);
      },
      (err) => {
        sessionStorage.setItem(
          USER_LOCATION_KEY,
          JSON.stringify({
            error: err.code,
            updatedAt: Date.now()
          })
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  }, []);

  useEffect(() => {
    if (!termoBusca.trim()) carregarTodos();
    else buscar(termoBusca);
  }, [termoBusca, posicaoUsuario]);

  return (
    <div className={styles.recoPage}>
      {/* NAVBAR */}
      <nav className={styles.recoNavbar}>
        <div
          className={styles.recoLogo}
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <img src="/imgs/Logo Aboa 1.png" alt="Logo" />
        </div>

        <div className={styles.recoLinks}>
          {(() => {
            const usuario = JSON.parse(localStorage.getItem("usuario"));
            if (!usuario) return <a href="/login">Minha conta</a>;
            if (usuario.tipo === "restaurante")
              return <a href="/minha-conta-rest">Minha conta</a>;
            return <a href="/minha-conta-usuario">Minha conta</a>;
          })()}
          <a href="/login">Sair</a>
        </div>
      </nav>

      {/* DESTAQUE */}
      {destaque ? (
        <div className={styles.recoMain}>
          <div className={styles.recoInfo}>
            <h1>A boa de hoje é:</h1>
            <h2 className={styles.recoName}>{destaque.nome}</h2>
            <p className={styles.recoDesc}>{destaque.descricao}</p>
            {formatarDistancia(destaque.distanciaKm) && (
              <p className={styles.recoDistance}>
                {formatarDistancia(destaque.distanciaKm)} de você
              </p>
            )}

            <div className={styles.recoButtons}>
              {/* VER CARDÁPIO CORRIGIDO */}
              <button
                onClick={() =>
                  navigate("/cardapio", {
                    state: { restaurante: destaque }
                  })
                }
              >
                Ver Cardápio
              </button>

              {/* IR PRA LÁ */}
              <button onClick={() => abrirRota(destaque)}>Ir pra lá</button>
            </div>
          </div>

          <div className={styles.recoImageVertical}>
            <img
              src={`${API_URL}${destaque.fotoUrl}`}
              alt={destaque.nome}
            />
          </div>
        </div>
      ) : (
        <p className={styles.loading}>Nenhum resultado encontrado :(</p>
      )}


      {/* OUTRAS RECOMENDAÇÕES */}
      <div className={styles.recoOtherTitle}>Outras recomendações:</div>

      <div className={styles.recoCards}>
        {outras.map((item) => (
          <div key={item._id} className={styles.recoCard}>
            <div className={styles.recoCardImg}>
              <img
                src={`${API_URL}${item.fotoUrl}`}
                alt={item.nome}
              />
            </div>

            <h3 className={styles.recoCardTitle}>{item.nome}</h3>
            {formatarDistancia(item.distanciaKm) && (
              <p className={styles.recoCardDistance}>
                {formatarDistancia(item.distanciaKm)} de você
              </p>
            )}
            <p className={styles.recoCardDesc}>{item.descricao}</p>

            <button
              className={styles.recoCardBtn}
              onClick={() =>
                navigate("/cardapio", {
                  state: { restaurante: item }
                })
              }
            >
              Mais informações
            </button>
          </div>
        ))}
      </div>

      {modalRota && (
        <div className={styles.routeOverlay}>
          <div className={styles.routeModal}>
            <div className={styles.routeHeader}>
              <h2>Rota até {modalRota.restaurante.nome}</h2>
            </div>

            <div className={styles.routeMapBox}>
              <MapContainer
                key={modalRota.restaurante._id}
                center={[modalRota.origem.lat, modalRota.origem.lng]}
                zoom={13}
                className={styles.routeMap}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker
                  position={[modalRota.origem.lat, modalRota.origem.lng]}
                  icon={userIcon}
                >
                  <Popup>Você está aqui</Popup>
                </Marker>

                <Marker
                  position={[modalRota.destino.lat, modalRota.destino.lng]}
                  icon={destinationIcon}
                >
                  <Popup>{modalRota.restaurante.nome}</Popup>
                </Marker>

                {rota?.pontos && (
                  <Polyline positions={rota.pontos} color="#d35400" weight={5} />
                )}
              </MapContainer>
            </div>

            <div className={styles.routeInfo}>
              {carregandoRota && <p>Traçando rota...</p>}
              {mensagemRota && <p>{mensagemRota}</p>}
              {rota && (
                <p>
                  Distância: {formatarDistancia(rota.distanciaKm)} | Tempo estimado:{" "}
                  {formatarTempo(rota.duracaoSegundos)}
                </p>
              )}
            </div>

            <div className={styles.routeActions}>
              <button onClick={() => setModalRota(null)}>Fechar</button>
              <button onClick={iniciarRota}>Iniciar rota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
