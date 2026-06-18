import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./recomenda_nova.module.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { API_URL } from "../../config/api.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const RAIO_KM = 10;
const USER_LOCATION_KEY = "aboa:userLocation";
const USER_LOCATION_UPDATED_EVENT = "aboa:userLocationUpdated";

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

function calcularDistanciaKm(a, b) {
  if (!a || !b) return null;

  const toRad = (valor) => (valor * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function calcularSetaDirecao(a, b) {
  if (!a || !b) return "•";

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizado = (bearing + 360) % 360;

  if (normalizado >= 337.5 || normalizado < 22.5) return "↑";
  if (normalizado < 67.5) return "↗";
  if (normalizado < 112.5) return "→";
  if (normalizado < 157.5) return "↘";
  if (normalizado < 202.5) return "↓";
  if (normalizado < 247.5) return "↙";
  if (normalizado < 292.5) return "←";
  return "↖";
}

function formatarTempo(segundos) {
  if (typeof segundos !== "number") return null;

  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function traduzirModifier(modifier = "") {
  const mapa = {
    left: "à esquerda",
    right: "à direita",
    slight_left: "levemente à esquerda",
    slight_right: "levemente à direita",
    sharp_left: "fortemente à esquerda",
    sharp_right: "fortemente à direita",
    uturn: "retorne"
  };

  return mapa[modifier] || modifier.replace(/_/g, " ");
}

function traduzirTipoPasso(step) {
  const tipo = step?.maneuver?.type || "";
  const modifier = step?.maneuver?.modifier || "";
  const exitNumber = step?.maneuver?.exit;
  const via = step?.name?.trim();

  const comandos = {
    depart: "Siga",
    turn: `Vire ${traduzirModifier(modifier)}`,
    new_name: `Continue pela ${via || "próxima via"}`,
    merge: "Entre na via",
    on_ramp: "Acesse a alça de acesso",
    off_ramp: "Saia da via",
    fork: `Mantenha-se ${traduzirModifier(modifier)}`,
    end_of_road: `Ao final da via, vire ${traduzirModifier(modifier)}`,
    roundabout: exitNumber
      ? `Na rotatória, pegue a ${exitNumber}ª saída`
      : "Na rotatória, siga em frente",
    rotary: exitNumber
      ? `Na rotatória, pegue a ${exitNumber}ª saída`
      : "Na rotatória, siga em frente",
    exit_rotary: "Saia da rotatória",
    arrive: "Você chegou ao destino"
  };

  return comandos[tipo] || `Siga ${traduzirModifier(modifier)}`;
}

function formatarPassoRota(step, index) {
  const distancia = formatarDistancia((step?.distance || 0) / 1000);
  const acao = traduzirTipoPasso(step);
  const via = step?.name?.trim() ? ` na ${step.name.trim()}` : "";

  return `${index + 1}. ${acao}${via}${distancia ? ` por ${distancia}` : ""}`;
}

function RouteAutoFit({ pontos }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(pontos) || pontos.length < 2) return;

    const bounds = L.latLngBounds(pontos);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [map, pontos]);

  return null;
}

function RouteFollowUser({ posicao }) {
  const map = useMap();

  useEffect(() => {
    if (!posicao) return;

    map.panTo([posicao.lat, posicao.lng], {
      animate: true,
      duration: 0.5
    });
  }, [map, posicao]);

  return null;
}

export default function Recomenda() {
  const query = useQuery();
  const termoBusca = query.get("q") || "";

  const [destaque, setDestaque] = useState(null);
  const [outras, setOutras] = useState([]);
  const [posicaoUsuario, setPosicaoUsuario] = useState(null);
  const [modalRota, setModalRota] = useState(null);
  const [rota, setRota] = useState(null);
  const [passosRota, setPassosRota] = useState([]);
  const [mostrarPassosRota, setMostrarPassosRota] = useState(false);
  const [mensagemRota, setMensagemRota] = useState("");
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [vozAtiva, setVozAtiva] = useState(false);
  const [posicaoAtualRota, setPosicaoAtualRota] = useState(null);
  const [indicePassoAtual, setIndicePassoAtual] = useState(-1);
  const [seguirUsuario, setSeguirUsuario] = useState(true);
  const [ultimaMensagemFalada, setUltimaMensagemFalada] = useState("");
  const navigate = useNavigate();
  const pontoAcompanhar = posicaoAtualRota || modalRota?.origem || null;
  const distanciaDestinoAtual =
    pontoAcompanhar && modalRota?.destino
      ? calcularDistanciaKm(pontoAcompanhar, modalRota.destino)
      : null;
  const setaDirecao = calcularSetaDirecao(pontoAcompanhar, modalRota?.destino);
  const indicePassoAtualRef = useRef(indicePassoAtual);
  const ultimaMensagemFaladaRef = useRef(ultimaMensagemFalada);

  function comLocalizacao(url) {
    if (!posicaoUsuario) return url;

    const separador = url.includes("?") ? "&" : "?";
    return `${url}${separador}lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}&raioKm=${RAIO_KM}`;
  }

  async function buscar(termo) {
    const urlBusca = `${API_URL}/api/estabelecimentos/buscar?q=${encodeURIComponent(
      termo
    )}`;
    const resp = await fetch(comLocalizacao(urlBusca));
    let data = await resp.json();

    if (posicaoUsuario && Array.isArray(data) && data.length === 0) {
      const respSemRaio = await fetch(urlBusca);
      data = await respSemRaio.json();
    }

    if (data.length === 0) {
      setDestaque(null);
      setOutras([]);
      return;
    }

    setDestaque(data[0]);
    setOutras(data.slice(1, 4));
  }

  async function carregarTodos() {
    const resp = await fetch(comLocalizacao(`${API_URL}/api/estabelecimentos`));
    const data = await resp.json();

    setDestaque(data[0] || null);
    setOutras(data.slice(1, 4));
  }

  async function abrirRota(restaurante) {
    const origem = posicaoUsuario || lerLocalizacaoSalva();
    const destino = getCoordenadasRestaurante(restaurante);

    if (!origem) {
      setModalRota({ restaurante, origem: null, destino });
      setRota(null);
      setPassosRota([]);
      setMostrarPassosRota(false);
      setMensagemRota("Permita o acesso à localização para montar a rota no app.");
      return;
    }

    if (!destino) {
      setModalRota({ restaurante, origem, destino: null });
      setRota(null);
      setPassosRota([]);
      setMostrarPassosRota(false);
      setMensagemRota("Este estabelecimento ainda não tem coordenadas registradas.");
      return;
    }

    setModalRota({ restaurante, origem, destino });
    setRota(null);
    setPassosRota([]);
    setMostrarPassosRota(false);
    setMensagemRota("");
    setCarregandoRota(true);

    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson&steps=true`
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

      const passos = (melhorRota.legs || []).flatMap((perna) => perna.steps || []);
      setPassosRota(passos);
    } catch (err) {
      setMensagemRota("Não foi possível traçar a rota agora.");
    } finally {
      setCarregandoRota(false);
    }
  }

  function iniciarRota() {
    if (!rota) return;

    setMostrarPassosRota((valorAtual) => !valorAtual);
  }

  function falarTexto(texto) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setVozAtiva(false);

    setVozAtiva(true);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    indicePassoAtualRef.current = indicePassoAtual;
  }, [indicePassoAtual]);

  useEffect(() => {
    ultimaMensagemFaladaRef.current = ultimaMensagemFalada;
  }, [ultimaMensagemFalada]);

  function falarRota() {
    if (!rota) return;

    if (!window.speechSynthesis) {
      setMensagemRota("Seu navegador não suporta leitura por voz.");
      return;
    }

    const partes = [
      `Rota até ${modalRota.restaurante.nome}.`,
      `Distância estimada de ${formatarDistancia(rota.distanciaKm)}.`,
      `Tempo estimado de ${formatarTempo(rota.duracaoSegundos)}.`,
      ...passosRota.map((step, index) => formatarPassoRota(step, index))
    ];

    falarTexto(partes.join(" "));
  }

  useEffect(() => {
    if (!modalRota?.origem || !modalRota?.destino || !rota?.pontos) {
      setPosicaoAtualRota(null);
      setIndicePassoAtual(-1);
      setUltimaMensagemFalada("");
      return undefined;
    }

    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const atual = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        setPosicaoAtualRota(atual);

        if (seguirUsuario) {
          setPosicaoUsuario(atual);
        }

        if (!passosRota.length || !rota?.distanciaKm) return;

        const distanciaDestino = calcularDistanciaKm(atual, modalRota.destino);
        if (distanciaDestino !== null && distanciaDestino < 0.12) {
          const mensagemChegada = "Você chegou ao destino.";
          if (ultimaMensagemFaladaRef.current !== mensagemChegada) {
            ultimaMensagemFaladaRef.current = mensagemChegada;
            setUltimaMensagemFalada(mensagemChegada);
            setIndicePassoAtual(passosRota.length - 1);
            falarTexto(mensagemChegada);
          }
          return;
        }

        const progresso = Math.max(0, Math.min(1, 1 - distanciaDestino / rota.distanciaKm));
        const proximoIndice = Math.min(
          passosRota.length - 1,
          Math.max(0, Math.floor(progresso * passosRota.length))
        );

        if (proximoIndice !== indicePassoAtualRef.current && passosRota[proximoIndice]) {
          indicePassoAtualRef.current = proximoIndice;
          setIndicePassoAtual(proximoIndice);
          const mensagem = formatarPassoRota(passosRota[proximoIndice], proximoIndice);
          if (mensagem !== ultimaMensagemFaladaRef.current) {
            ultimaMensagemFaladaRef.current = mensagem;
            setUltimaMensagemFalada(mensagem);
            falarTexto(mensagem);
          }
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [modalRota, rota, passosRota, seguirUsuario]);

  useEffect(() => {
    if (!modalRota) {
      setPosicaoAtualRota(null);
      setIndicePassoAtual(-1);
      setUltimaMensagemFalada("");
      setSeguirUsuario(true);
    }
  }, [modalRota]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    function atualizarLocalizacaoSalva() {
      const localizacaoSalva = lerLocalizacaoSalva();
      if (localizacaoSalva) {
        setPosicaoUsuario(localizacaoSalva);
      }
    }

    window.addEventListener(USER_LOCATION_UPDATED_EVENT, atualizarLocalizacaoSalva);

    const localizacaoSalva = lerLocalizacaoSalva();
    if (localizacaoSalva) {
      setPosicaoUsuario(localizacaoSalva);
      return () => {
        window.removeEventListener(
          USER_LOCATION_UPDATED_EVENT,
          atualizarLocalizacaoSalva
        );
      };
    }

    if (sessionStorage.getItem(USER_LOCATION_KEY) || !navigator.geolocation) {
      return () => {
        window.removeEventListener(
          USER_LOCATION_UPDATED_EVENT,
          atualizarLocalizacaoSalva
        );
      };
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

    return () => {
      window.removeEventListener(
        USER_LOCATION_UPDATED_EVENT,
        atualizarLocalizacaoSalva
      );
    };
  }, []);

  useEffect(() => {
    if (!termoBusca.trim()) carregarTodos();
    else buscar(termoBusca);
  }, [termoBusca, posicaoUsuario]);

  return (
    <div className={styles.recoPage}>
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
            if (usuario.tipo === "restaurante") {
              return <a href="/minha-conta-rest">Minha conta</a>;
            }
            return <a href="/minha-conta-usuario">Minha conta</a>;
          })()}
          <a href="/login">Sair</a>
        </div>
      </nav>

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
              <button
                onClick={() =>
                  navigate("/cardapio", {
                    state: { restaurante: destaque }
                  })
                }
              >
                Ver Cardápio
              </button>

              <button onClick={() => abrirRota(destaque)}>Ir pra lá</button>
            </div>
          </div>

          <div className={styles.recoImageVertical}>
            <img src={`${API_URL}${destaque.fotoUrl}`} alt={destaque.nome} />
          </div>
        </div>
      ) : (
        <p className={styles.loading}>Nenhum resultado encontrado :(</p>
      )}

      <div className={styles.recoOtherTitle}>Outras recomendações:</div>

      <div className={styles.recoCards}>
        {outras.map((item) => (
          <div key={item._id} className={styles.recoCard}>
            <div className={styles.recoCardImg}>
              <img src={`${API_URL}${item.fotoUrl}`} alt={item.nome} />
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
              <button onClick={() => setModalRota(null)}>Fechar</button>
            </div>

            <div className={styles.routeContent}>
              <div className={styles.routeMapBox}>
                <MapContainer
                  key={modalRota.restaurante._id}
                  center={[modalRota.origem.lat, modalRota.origem.lng]}
                  zoom={13}
                  className={styles.routeMap}
                  scrollWheelZoom
                >
                  <RouteAutoFit pontos={rota?.pontos} />
                  <RouteFollowUser posicao={posicaoAtualRota || modalRota.origem} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker
                    position={
                      posicaoAtualRota
                        ? [posicaoAtualRota.lat, posicaoAtualRota.lng]
                        : [modalRota.origem.lat, modalRota.origem.lng]
                    }
                    icon={userIcon}
                  >
                    <Popup>
                      {posicaoAtualRota ? "Sua posição atual" : "Você está aqui"}
                    </Popup>
                  </Marker>

                  {modalRota.destino && (
                    <Marker
                      position={[modalRota.destino.lat, modalRota.destino.lng]}
                      icon={destinationIcon}
                    >
                      <Popup>{modalRota.restaurante.nome}</Popup>
                    </Marker>
                  )}

                  {rota?.pontos && (
                    <Polyline positions={rota.pontos} color="#d35400" weight={5} />
                  )}
                </MapContainer>
              </div>

              <aside className={styles.routeSidebar}>
                <div className={styles.routeSummary}>
                  <p className={styles.routeKicker}>Sua rota principal</p>
                  <h3>{modalRota.restaurante.nome}</h3>
                  <p className={styles.routeAddress}>{modalRota.restaurante.endereco}</p>
                  {rota && (
                    <div className={styles.routeLiveBanner}>
                      <span className={styles.routeLiveArrow}>{setaDirecao}</span>
                      <div>
                        <strong>{seguirUsuario ? "Seguindo você" : "Visualização livre"}</strong>
                        <p>
                          {distanciaDestinoAtual !== null
                            ? `${formatarDistancia(distanciaDestinoAtual)} até o destino`
                            : "Acompanhe o trajeto em tempo real"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.routeStats}>
                  {carregandoRota && <p>Traçando rota...</p>}
                  {mensagemRota && <p>{mensagemRota}</p>}
                  {rota && (
                    <>
                      <div className={styles.routeStatCard}>
                        <span>Distância</span>
                        <strong>{formatarDistancia(rota.distanciaKm)}</strong>
                      </div>
                      <div className={styles.routeStatCard}>
                        <span>Tempo estimado</span>
                        <strong>{formatarTempo(rota.duracaoSegundos)}</strong>
                      </div>
                    </>
                  )}
                </div>

                {rota && (
                  <div className={styles.routeVoiceBlock}>
                      <button onClick={() => setSeguirUsuario((valorAtual) => !valorAtual)}>
                        {seguirUsuario ? "Parar de seguir" : "Seguir localização"}
                      </button>
                    <button onClick={falarRota} disabled={vozAtiva}>
                      {vozAtiva ? "Lendo rota..." : "Ouvir rota"}
                    </button>
                  </div>
                )}

                {rota && mostrarPassosRota && (
                  <div className={styles.routeSteps}>
                    <div className={styles.routeStepsHeader}>
                      <h3>Passos da rota</h3>
                      {indicePassoAtual >= 0 && (
                        <span className={styles.routeStepBadge}>
                          Próximo passo {indicePassoAtual + 1}
                        </span>
                      )}
                    </div>
                    <ul className={styles.routeStepsList}>
                      {passosRota.map((step, index) => (
                        <li
                          key={index}
                          className={
                            index === indicePassoAtual ? styles.routeStepActive : ""
                          }
                        >
                          <span className={styles.routeStepIndex}>{index + 1}</span>
                          <span className={styles.routeStepText}>
                            {formatarPassoRota(step, index)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.routeActions}>
                  <button onClick={iniciarRota} disabled={!rota}>
                    {mostrarPassosRota ? "Ocultar passos" : "Ver passos"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
