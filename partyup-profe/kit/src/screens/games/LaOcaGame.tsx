/**
 * PREVIASPLUS — La Fiesta de la Oca
 * 3 card types: NORMAL (black bg), SPECIAL (animated bg), VERSUS (pick → animated)
 */

import { GameIntro } from "@/src/components/games/GameIntro";
import { PlayerSetup } from "@/src/components/games/PlayerSetup";

import { Colors } from "@/src/constants/theme";
import { useGameStore } from "@/src/store/gameStore";
import {
    Blur,
    Canvas,
    Circle,
    Group,
    RadialGradient,
    vec,
} from "@shopify/react-native-skia";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MeshGradientView } from "expo-mesh-gradient";
import { router } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Design tokens ───────────────────────────
const ACCENT = "#F59E0B";
const ACCENT_DARK = "#D97706";
const ROUNDED: string = Platform.OS === "ios" ? "System" : "sans-serif";
const SPRING_GENTLE = { damping: 22, stiffness: 160, mass: 0.8 };
const SPRING_SNAPPY = { damping: 18, stiffness: 280, mass: 0.5 };

// ─── Square types ────────────────────────────
type SquareType =
  | "normal"
  | "drink"
  | "chug"
  | "versus"
  | "boost"
  | "bomb"
  | "golden"
  | "final";

interface SquareConfig {
  type: SquareType;
  emoji: string;
  label: string;
  color: string;
}

const SQUARE_TYPES: Record<SquareType, Omit<SquareConfig, "type">> = {
  normal: { emoji: "", label: "", color: "#8E8E93" },
  drink: { emoji: "", label: "Drink", color: "#FF9F0A" },
  chug: { emoji: "", label: "Chug", color: "#BF5AF2" },
  versus: { emoji: "", label: "Versus", color: "#FF453A" },
  boost: { emoji: "", label: "+3 squares", color: "#30D158" },
  bomb: { emoji: "", label: "-3 squares", color: "#FF375F" },
  golden: { emoji: "", label: "Special", color: "#FFD60A" },
  final: { emoji: "", label: "Final", color: "#FF69B4" },
};

const TILE_GRADIENTS: Record<SquareType, [string, string]> = {
  normal: ["rgba(142,142,147,0.16)", "rgba(142,142,147,0.08)"],
  drink: ["rgba(255,159,10,1)", "rgba(200,100,0,1)"],
  chug: ["rgba(191,90,242,1)", "rgba(120,40,200,1)"],
  versus: ["rgba(255,69,58,1)", "rgba(200,20,40,1)"],
  boost: ["rgba(48,209,88,1)", "rgba(20,150,50,1)"],
  bomb: ["rgba(255,55,95,1)", "rgba(200,20,60,1)"],
  golden: ["rgba(255,214,10,1)", "rgba(255,140,0,1)"],
  final: ["rgba(255,105,180,1)", "rgba(220,40,140,1)"],
};

// ─── Board presets ───────────────────────────
type BoardType = "normal" | "pro";

const NORMAL_SQUARE_MAP: Record<number, SquareType> = {
  5: "drink",
  15: "drink",
  26: "drink",
  36: "drink",
  46: "drink",
  12: "chug",
  30: "chug",
  48: "chug",
  8: "versus",
  22: "versus",
  38: "versus",
  52: "versus",
  19: "boost",
  35: "boost",
  44: "boost",
  10: "bomb",
  28: "bomb",
  40: "bomb",
  50: "bomb",
  29: "golden",
  58: "final",
};

const PRO_SQUARE_MAP: Record<number, SquareType> = {
  4: "drink", 11: "drink", 18: "drink", 27: "drink",
  37: "drink", 48: "drink", 59: "drink", 70: "drink",
  79: "drink",
  9: "chug", 22: "chug", 38: "chug",
  53: "chug", 65: "chug", 80: "chug",
  7: "versus", 16: "versus", 30: "versus",
  42: "versus", 55: "versus", 67: "versus", 77: "versus",
  13: "boost", 33: "boost", 46: "boost",
  60: "boost", 73: "boost", 85: "boost",
  20: "bomb", 28: "bomb", 40: "bomb",
  51: "bomb", 63: "bomb", 75: "bomb", 84: "bomb",
  25: "golden", 57: "golden", 82: "golden",
  89: "final",
};

interface BoardPreset {
  totalSquares: number;
  cols: number;
  rows: number;
  squareMap: Record<number, SquareType>;
  spiral: { col: number; row: number }[];
  edges: { top: boolean; right: boolean; bottom: boolean; left: boolean }[];
  sqSize: number;
  sqH: number;
  boardH: number;
}

// Active board preset (set by main component before render)
let _board: BoardPreset;

function getSquareType(i: number): SquareType {
  return _board.squareMap[i] || "normal";
}
function getSquareConfig(i: number): SquareConfig {
  const type = getSquareType(i);
  return { type, ...SQUARE_TYPES[type] };
}

// ─── Challenges ──────────────────────────────
const DRINK_CHALLENGES = [
  "Give 3 drinks to whoever you want",
  "Everyone drinks if wearing dark clothing",
  "Drink if you've checked your phone in the last 5 min",
  "Tallest drinks 2, shortest gives 3 drinks",
  "Drink 2 and give 3 more",
  "Everyone cheers and drinks 2",
  "Drink if you have the most social media apps",
  "New rule: choose who drinks double next round",
  "Drink 3 or give 5 to others",
  "Last to raise your hand drinks 3",
  "Give 4 drinks however you want",
  "Pick someone: you both drink 2",
];

const CHUG_CHALLENGES = [
  "CHUG CHUG CHUG",
  "You and the person to your right: chug together",
  "Everyone chugs, last to finish drinks another",
  "Waterfall: everyone drinks until the previous person stops",
  "Drink non-stop for 5 seconds",
  "Pick someone: you both chug together",
  "Group votes: someone chugs or everyone drinks 3",
  "Chug and give 5 drinks, you're king of the round",
];

const VERSUS_CHALLENGES = [
  "Who drinks fastest: loser drinks 5",
  "Staring contest: first to laugh drinks 4",
  "Rock, paper, scissors: loser chugs",
  "Who can go longest without blinking: loser drinks 3 and gives 2",
  "Arm wrestling: loser gives 5 drinks",
  "Compliment battle: who runs out of ideas drinks 4",
  "Count to 3 together: whoever says the same number drinks 3",
  "Loser drinks 5 and winner gives 3 more",
  "Whoever takes longest to finish their drink gives 4 to the other",
  "Group picks the punishment: minimum 4 drinks for loser",
];

const NORMAL_CHALLENGES = [
  "I have never ever kissed someone in this group",
  "I have never ever snuck into a party",
  "I have never ever lied about my age",
  "I have never ever stalked an ex at 3am",
  "I have never ever thrown up in an Uber",
  "I have never ever sent a drunk text I regret",
  "I have never ever faked being sick to avoid going out",
  "Who is most likely to end up sleeping on the floor",
  "Who is most likely to lose their phone tonight",
  "Who is most likely to say something they'll regret",
  "Who is most likely to cry before the night ends",
  "Who is most likely to hook up with someone tonight",
  "Who is most likely to end up shirtless",
  "Drink without using your hands · or drink 4",
  "Call your last contact and tell them you love them · or drink 5",
  "Imitate the person to your right · or drink 3",
  "Drink once",
  "Give a drink to the person on your left",
  "Point to the drunkest person: they drink 2",
  "Make up a drinking rule that lasts 3 rounds · or drink 3",
  "Give 2 drinks to whoever you want",
  "Everyone wearing glasses drinks",
  "Drink if you haven't had water in the last hour",
  "Sing the chorus of a song · or drink 4",
  "Name 5 European capitals in 10 seconds · or drink 3",
  "Tell a secret · or drink 6",
  "Do 10 push-ups · or drink 4",
];

const GOLDEN_CHALLENGES = [
  "GOLDEN SQUARE! Pick 2 people: they each drink 5",
  "GOLDEN SQUARE! Everyone drinks 3 in your honor",
  "GOLDEN SQUARE! Make up a rule that lasts the whole game",
  "GOLDEN SQUARE! You can save this turn to force someone to chug",
  "GOLDEN SQUARE! Give 8 drinks however you want",
  "GOLDEN SQUARE! Group votes: someone chugs or everyone drinks 2",
  "GOLDEN SQUARE! Waterfall: you decide the order",
  "GOLDEN SQUARE! Everyone drinks except you, you're king of the round",
];

// ─── Board config (spiral) ──────────────────
const BOARD_PADDING = 16;
const BOARD_WIDTH = SCREEN_WIDTH - 28;
const SQUARE_GAP = 3;

function buildSpiralPath(
  total: number,
  cols: number,
  rows: number,
): { col: number; row: number }[] {
  const path: { col: number; row: number }[] = [];
  let top = 0,
    bottom = rows - 1,
    left = 0,
    right = cols - 1;
  let count = 0;
  while (count < total) {
    for (let c = left; c <= right && count < total; c++) {
      path.push({ col: c, row: bottom });
      count++;
    }
    bottom--;
    for (let r = bottom; r >= top && count < total; r--) {
      path.push({ col: right, row: r });
      count++;
    }
    right--;
    for (let c = right; c >= left && count < total; c--) {
      path.push({ col: c, row: top });
      count++;
    }
    top++;
    for (let r = top; r <= bottom && count < total; r++) {
      path.push({ col: left, row: r });
      count++;
    }
    left++;
  }
  return path;
}

function buildPathEdges(
  spiral: { col: number; row: number }[],
  total: number,
) {
  return spiral.map((curr, i) => {
    const edges = { top: false, right: false, bottom: false, left: false };
    if (i > 0) {
      const prev = spiral[i - 1];
      if (prev.col < curr.col) edges.left = true;
      if (prev.col > curr.col) edges.right = true;
      if (prev.row < curr.row) edges.top = true;
      if (prev.row > curr.row) edges.bottom = true;
    }
    if (i < total - 1) {
      const next = spiral[i + 1];
      if (next.col < curr.col) edges.left = true;
      if (next.col > curr.col) edges.right = true;
      if (next.row < curr.row) edges.top = true;
      if (next.row > curr.row) edges.bottom = true;
    }
    return edges;
  });
}

function makeBoardPreset(
  total: number,
  cols: number,
  rows: number,
  squareMap: Record<number, SquareType>,
): BoardPreset {
  const sqSize =
    (BOARD_WIDTH - BOARD_PADDING * 2 - SQUARE_GAP * (cols - 1)) / cols;
  const sqH = Math.round(sqSize * 1.2);
  const boardH =
    BOARD_PADDING * 2 + rows * sqH + (rows - 1) * SQUARE_GAP;
  const spiral = buildSpiralPath(total, cols, rows);
  const edges = buildPathEdges(spiral, total);
  return {
    totalSquares: total,
    cols,
    rows,
    squareMap,
    spiral,
    edges,
    sqSize,
    sqH,
    boardH,
  };
}

const BOARDS: Record<BoardType, BoardPreset> = {
  normal: makeBoardPreset(59, 8, 8, NORMAL_SQUARE_MAP),
  pro: makeBoardPreset(90, 10, 10, PRO_SQUARE_MAP),
};

// Initialize to normal (overridden by main component)
_board = BOARDS.normal;

// Default sizes for StyleSheet (normal board)
const SQUARE_SIZE = BOARDS.normal.sqSize;
const SQUARE_H = BOARDS.normal.sqH;
const BOARD_HEIGHT = BOARDS.normal.boardH;

// ─── Game phases & player data ───────────────
type GamePhase = "intro" | "setup" | "board-type" | "board" | "card" | "finished";

const PLAYER_STICKERS = [
  require("@/assets/emojis/partying_face.png"),
  require("@/assets/emojis/fire.png"),
  require("@/assets/emojis/tropical_drink.png"),
  require("@/assets/emojis/crown.png"),
  require("@/assets/emojis/tada.png"),
  require("@/assets/emojis/cocktail.png"),
  require("@/assets/emojis/mirror_ball.png"),
  require("@/assets/emojis/beer.png"),
];

const PLAYER_COLORS = [
  "#FFCC00",
  "#FF3B30",
  "#007AFF",
  "#34C759",
  "#FF9500",
  "#FF2D55",
  "#AF52DE",
  "#5AC8FA",
];

// ─── Sticker maps ────────────────────────────
const NORMAL_TILE_STICKERS = [
  require("@/assets/emojis/beer.png"),
  require("@/assets/emojis/wine_glass.png"),
  require("@/assets/emojis/cocktail.png"),
  require("@/assets/emojis/tropical_drink.png"),
  require("@/assets/emojis/champagne.png"),
  require("@/assets/emojis/tumbler_glass.png"),
  require("@/assets/emojis/clinking_glasses.png"),
  require("@/assets/emojis/beers.png"),
];

const SPECIAL_TILE_STICKERS: Record<string, any> = {
  drink: require("@/assets/emojis/beer.png"),
  chug: require("@/assets/emojis/beers.png"),
  versus: require("@/assets/emojis/two_cards.png"),
  boost: require("@/assets/emojis/champagne.png"),
  bomb: require("@/assets/emojis/fire.png"),
  golden: require("@/assets/emojis/crown.png"),
  final: require("@/assets/emojis/right_anger_bubble.png"),
};

// GIF stickers for special/versus card animations
const CARD_STICKER_GIFS: Record<string, any> = {
  drink: require("@/assets/gifs/beer STICKER.gif"),
  chug: require("@/assets/gifs/Beer Drinking Sticker.gif"),
  versus: require("@/assets/gifs/Cat Beer Sticker.gif"),
  boost: require("@/assets/gifs/Dance Party Sticker.gif"),
  bomb: require("@/assets/gifs/Drunk Oh No Sticker by Mighty Oak.gif"),
  golden: require("@/assets/gifs/Party Celebrate Sticker by University of Florida.gif"),
  final: require("@/assets/emojis/right_anger_bubble.png"),
};

function seededTileSticker(tileIndex: number) {
  return NORMAL_TILE_STICKERS[tileIndex % NORMAL_TILE_STICKERS.length];
}

function randomNormalSticker() {
  return NORMAL_TILE_STICKERS[
    Math.floor(Math.random() * NORMAL_TILE_STICKERS.length)
  ];
}

function getSquareXY(index: number): { x: number; y: number } {
  const ci = Math.max(0, Math.min(index, _board.totalSquares - 1));
  const { col, row } = _board.spiral[ci];
  return {
    x: BOARD_PADDING + col * (_board.sqSize + SQUARE_GAP) + _board.sqSize / 2,
    y: BOARD_PADDING + row * (_board.sqH + SQUARE_GAP) + _board.sqH / 2,
  };
}

// ─── Card color maps ─────────────────────────
const CARD_GRADIENT_COLORS: Record<string, [string, string]> = {
  normal: ["rgba(142,142,147,0.12)", "rgba(142,142,147,0.05)"],
  drink: ["rgba(255,159,10,1)", "rgba(200,100,0,1)"],
  chug: ["rgba(191,90,242,1)", "rgba(120,40,200,1)"],
  versus: ["rgba(255,69,58,1)", "rgba(200,20,40,1)"],
  boost: ["rgba(48,209,88,1)", "rgba(20,150,50,1)"],
  bomb: ["rgba(255,55,95,1)", "rgba(200,20,60,1)"],
  golden: ["rgba(255,214,10,1)", "rgba(255,140,0,1)"],
  final: ["rgba(255,105,180,1)", "rgba(220,40,140,1)"],
};

const BG_TINTS: Record<string, string> = {
  drink: "255,140,0",
  chug: "180,80,255",
  versus: "255,70,60",
  boost: "50,220,100",
  bomb: "255,60,100",
  golden: "255,200,0",
  final: "255,105,180",
  normal: "28,28,30",
};

// ─── Dice ────────────────────────────────────
const DOT_LAYOUTS: Record<number, Array<{ top: string; left: string }>> = {
  1: [{ top: "50%", left: "50%" }],
  2: [
    { top: "30%", left: "70%" },
    { top: "70%", left: "30%" },
  ],
  3: [
    { top: "28%", left: "72%" },
    { top: "50%", left: "50%" },
    { top: "72%", left: "28%" },
  ],
  4: [
    { top: "28%", left: "28%" },
    { top: "28%", left: "72%" },
    { top: "72%", left: "28%" },
    { top: "72%", left: "72%" },
  ],
  5: [
    { top: "28%", left: "28%" },
    { top: "28%", left: "72%" },
    { top: "50%", left: "50%" },
    { top: "72%", left: "28%" },
    { top: "72%", left: "72%" },
  ],
  6: [
    { top: "28%", left: "28%" },
    { top: "28%", left: "72%" },
    { top: "50%", left: "28%" },
    { top: "50%", left: "72%" },
    { top: "72%", left: "28%" },
    { top: "72%", left: "72%" },
  ],
};

function RealDice({
  onRollComplete,
  disabled,
  currentPlayerName,
  currentPlayerColor,
}: {
  onRollComplete: (v: number) => void;
  disabled: boolean;
  currentPlayerName: string;
  currentPlayerColor: string;
}) {
  const [displayValue, setDisplayValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const { t } = useTranslation();

  const rollDice = useCallback(() => {
    if (disabled || isRolling) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRolling(true);
    scale.value = withSequence(
      withTiming(0.92, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 160, mass: 0.8 }),
    );
    rotateZ.value = withSequence(
      withTiming(4, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 10, stiffness: 120, mass: 0.7 }),
    );
    shakeX.value = withSpring(0, { damping: 20, stiffness: 200 });
    const finalValue = Math.floor(Math.random() * 6) + 1;
    let count = 0;
    const totalCycles = 6;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      count++;
      if (count >= totalCycles) {
        clearInterval(interval);
        setDisplayValue(finalValue);
        setIsRolling(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onRollComplete(finalValue), 120);
      }
    }, 100);
  }, [disabled, isRolling, onRollComplete]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotateZ.value}deg` },
      { translateX: shakeX.value },
    ],
  }));

  const dots = DOT_LAYOUTS[displayValue] || DOT_LAYOUTS[1];

  return (
    <View style={styles.diceSection}>
      <View style={styles.turnIndicator}>
        <View
          style={[styles.turnDot, { backgroundColor: currentPlayerColor }]}
        />
        <Text style={styles.turnText}>{currentPlayerName}</Text>
      </View>
      <Pressable onPress={rollDice} disabled={disabled || isRolling}>
        <Animated.View style={animStyle}>
          <View style={styles.dice}>
            {dots.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.diceDot,
                  {
                    top: d.top as any,
                    left: d.left as any,
                    marginTop: -6,
                    marginLeft: -6,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </Pressable>
      <Text style={styles.diceHint}>{isRolling ? "" : t('laOca.tapToRoll')}</Text>
    </View>
  );
}

// ─── Animated Token ──────────────────────────
function AnimatedToken({
  playerIndex,
  position,
  isActive,
  totalOnSquare,
  indexOnSquare,
  boardW,
  boardH,
}: {
  playerIndex: number;
  position: number;
  isActive: boolean;
  totalOnSquare: number;
  indexOnSquare: number;
  boardW: number;
  boardH: number;
}) {
  const pos = getSquareXY(position);
  const translateX = useSharedValue(pos.x);
  const translateY = useSharedValue(pos.y);
  const tokenScale = useSharedValue(1);
  const bounceY = useSharedValue(0);
  const prevPosition = useRef(position);
  const animQueue = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetX = (indexOnSquare - (totalOnSquare - 1) / 2) * 9;

  const glowCx = useSharedValue(pos.x);
  const glowCy = useSharedValue(pos.y);
  const glowPulse = useSharedValue(0);
  const glowR = useDerivedValue(() => 20 + glowPulse.value * 12);
  const glowOpacity = useDerivedValue(() =>
    isActive ? 0.35 + glowPulse.value * 0.15 : 0,
  );

  useEffect(() => {
    if (isActive) {
      glowPulse.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
  }, [isActive]);

  useEffect(() => {
    if (position === prevPosition.current) return;
    if (animQueue.current) clearTimeout(animQueue.current);
    const oldPos = prevPosition.current;
    const newPos = position;
    const diff = newPos - oldPos;
    const step = diff > 0 ? 1 : -1;
    const absDiff = Math.abs(diff);
    const STEP_DURATION = 160;
    let jumpIndex = 0;
    const doJump = () => {
      if (jumpIndex >= absDiff) {
        prevPosition.current = newPos;
        return;
      }
      const stepPos = oldPos + (jumpIndex + 1) * step;
      const clampedPos = Math.max(0, Math.min(stepPos, _board.totalSquares - 1));
      const target = getSquareXY(clampedPos);
      translateX.value = withSpring(target.x + offsetX, SPRING_SNAPPY);
      translateY.value = withSpring(target.y, SPRING_SNAPPY);
      if (isActive) {
        glowCx.value = withSpring(target.x, SPRING_SNAPPY);
        glowCy.value = withSpring(target.y, SPRING_SNAPPY);
      }
      bounceY.value = withSequence(
        withTiming(step > 0 ? -12 : -8, {
          duration: STEP_DURATION * 0.35,
          easing: Easing.out(Easing.cubic),
        }),
        withSpring(0, { damping: 18, stiffness: 380 }),
      );
      tokenScale.value = withSequence(
        withTiming(step > 0 ? 1.22 : 0.85, {
          duration: STEP_DURATION * 0.3,
          easing: Easing.out(Easing.cubic),
        }),
        withSpring(1, { damping: 14, stiffness: 280 }),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      jumpIndex++;
      animQueue.current = setTimeout(doJump, STEP_DURATION);
    };
    doJump();
    return () => {
      if (animQueue.current) clearTimeout(animQueue.current);
    };
  }, [position]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 16 },
      { translateY: translateY.value - 16 + bounceY.value },
      { scale: tokenScale.value },
    ],
  }));

  const tokenGlowStyle = useAnimatedStyle(() => ({
    opacity: isActive ? 0.5 : 0,
    transform: [
      { translateX: translateX.value - 20 },
      { translateY: translateY.value - 20 + bounceY.value },
      { scale: tokenScale.value },
    ],
  }));

  const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

  return (
    <>
      {isActive && (
        <Canvas
          style={{
            position: "absolute",
            width: boardW,
            height: boardH,
            top: 0,
            left: 0,
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <Group opacity={glowOpacity}>
            <Blur blur={14} />
            <Circle cx={glowCx} cy={glowCy} r={glowR}>
              <RadialGradient
                c={vec(0, 0)}
                r={32}
                colors={[playerColor + "55", playerColor + "00"]}
                positions={[0, 1]}
              />
            </Circle>
          </Group>
        </Canvas>
      )}
      <Animated.View
        style={[
          styles.tokenGlow,
          { backgroundColor: playerColor },
          tokenGlowStyle,
        ]}
      />
      <Animated.View style={[styles.token, animStyle]}>
        <View style={[styles.tokenInner, { borderColor: playerColor }]}>
          <Image
            source={PLAYER_STICKERS[playerIndex % PLAYER_STICKERS.length]}
            style={styles.tokenImage}
            contentFit="contain"
          />
        </View>
      </Animated.View>
    </>
  );
}

// ─── Mesh gradient (golden) ──────────────────
const MESH_COLUMNS = 4;
const MESH_ROWS = 4;

const MESH_COLORS_BASE: string[] = [
  "#A855F7",
  "#6366F1",
  "#A855F7",
  "#FBBF24",
  "#EC4899",
  "#A855F7",
  "#EC4899",
  "#A855F7",
  "#F97316",
  "#EC4899",
  "#F97316",
  "#A855F7",
  "#FBBF24",
  "#F97316",
  "#EC4899",
  "#A855F7",
];

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

function desaturateHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = 1 - amount;
  return rgbToHex(r * amount + l * t, g * amount + l * t, b * amount + l * t);
}

function darkenHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

const MESH_COLORS = MESH_COLORS_BASE.map((c) =>
  darkenHex(desaturateHex(c, 1), 0.85),
);

const MESH_POINTS_BASE: number[][] = [
  [0.0, 0.0],
  [0.3, 0.0],
  [0.7, 0.0],
  [1.0, 0.0],
  [0.0, 0.3],
  [0.7, 0.4],
  [0.2, 0.2],
  [1.0, 0.3],
  [0.0, 0.7],
  [0.3, 0.8],
  [0.7, 0.6],
  [1.0, 0.7],
  [0.0, 1.0],
  [0.3, 1.0],
  [0.7, 1.0],
  [1.0, 1.0],
];

// Static mesh gradient (no animation)
function useMeshAnimationState() {
  return { points: MESH_POINTS_BASE, colors: MESH_COLORS };
}

// ─── ChallengeCard (NORMAL / SPECIAL / VERSUS with inline pick) ─
function ChallengeCard({
  type,
  config,
  text,
  playerName,
  playerColor,
  playerIndex,
  onDone,
  players,
  currentPlayer,
}: {
  type: SquareType;
  config: SquareConfig;
  text: string;
  playerName: string;
  playerColor: string;
  playerIndex: number;
  onDone: () => void;
  players?: any[];
  currentPlayer?: number;
}) {
  const { t } = useTranslation();
  const isVersus = type === "versus";
  const isAnimatedBg = type !== "normal";
  const isSpecialEffect = type !== "normal";

  // ── Versus internal state ──
  const [vsOpponent, setVsOpponent] = useState<string | undefined>(undefined);
  const hasPicked = useSharedValue(0); // worklet-safe: 0 = pick, 1 = challenge
  const pickOpacity = useSharedValue(isVersus ? 1 : 0);
  const challengeOpacity = useSharedValue(isVersus ? 0 : 1);
  const gradientOpacity = useSharedValue(isVersus ? 0 : 1);

  // Mesh gradient for golden cards
  const { points: meshPoints, colors: meshColors } = useMeshAnimationState();

  // Entry animation
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Swipe dismiss
  const swipeX = useSharedValue(0);
  const swipeRotation = useSharedValue(0);
  const isDismissing = useRef(false);

  // Animated background color cycling
  const bgCycle = useSharedValue(0);

  // Sticker float
  const floatY = useSharedValue(0);
  const floatX = useSharedValue(0);
  const rotAnim = useSharedValue(0);
  const stickerRotation = useMemo(() => -6 + Math.random() * 12, []);

  // Random sticker for normal cards
  const normalSticker = useMemo(() => randomNormalSticker(), []);

  // ── Versus pick handler (shared value crossfade — UI thread, no re-render) ──
  const handlePickVersus = useCallback(
    (idx: number) => {
      if (!players) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setVsOpponent(players[idx]?.name);
      hasPicked.value = 1;
      // All on UI thread — instant
      pickOpacity.value = withTiming(0, {
        duration: 120,
        easing: Easing.in(Easing.cubic),
      });
      gradientOpacity.value = withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      challengeOpacity.value = withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      cardScale.value = 0.95;
      cardScale.value = withSpring(1, SPRING_SNAPPY);
    },
    [
      players,
      cardScale,
      pickOpacity,
      challengeOpacity,
      gradientOpacity,
      hasPicked,
    ],
  );

  useEffect(() => {
    overlayOpacity.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    cardOpacity.value = withTiming(1, { duration: 200 });
    cardScale.value = withSpring(1, SPRING_GENTLE);
    if (isSpecialEffect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  // Background color cycling — always start for animated bg types
  useEffect(() => {
    if (isAnimatedBg) {
      bgCycle.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, []);

  // Sticker float animation
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    floatX.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    rotAnim.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const bgTint = BG_TINTS[type] || BG_TINTS.normal;

  // Background: for versus in pick mode → plain black; gradient visible only after pick
  const animatedBgStyle = useAnimatedStyle(() => {
    if (!isAnimatedBg) return { backgroundColor: "rgba(28,28,30,0.97)" };
    const bgColor = interpolateColor(
      bgCycle.value,
      [0, 0.33, 0.66, 1],
      [
        "rgba(28,28,30,0.95)",
        `rgba(${bgTint},0.25)`,
        `rgba(${bgTint},0.35)`,
        "rgba(28,28,30,0.95)",
      ],
    );
    return { backgroundColor: bgColor };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const stickerParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { translateX: floatX.value },
      { rotate: `${stickerRotation + rotAnim.value}deg` },
    ],
  }));

  // Versus crossfade styles (UI thread)
  const pickContentStyle = useAnimatedStyle(() => ({
    opacity: pickOpacity.value,
  }));
  const challengeContentStyle = useAnimatedStyle(() => ({
    opacity: challengeOpacity.value,
  }));
  const gradientOverlayStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
  }));

  // Dismiss guard — versus cards can only dismiss after picking
  const alwaysDismissable = useSharedValue(1);
  const canDismissVal = isVersus ? hasPicked : alwaysDismissable;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const flyRightDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swipeX.value = withTiming(SCREEN_WIDTH * 1.3, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    });
    swipeRotation.value = withTiming(18, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    });
    overlayOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(() => onDoneRef.current(), 100);
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(10)
        .onUpdate((e) => {
          if (!canDismissVal.value) return;
          swipeX.value = e.translationX;
          swipeRotation.value = e.translationX * 0.06;
        })
        .onEnd((e) => {
          if (!canDismissVal.value) {
            swipeX.value = withSpring(0, SPRING_GENTLE);
            swipeRotation.value = withSpring(0, SPRING_GENTLE);
            return;
          }
          if (Math.abs(e.translationX) > 100) {
            runOnJS(flyRightDismiss)();
          } else {
            swipeX.value = withSpring(0, SPRING_GENTLE);
            swipeRotation.value = withSpring(0, SPRING_GENTLE);
          }
        }),
    [flyRightDismiss],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        if (canDismissVal.value) {
          runOnJS(flyRightDismiss)();
        }
      }),
    [flyRightDismiss],
  );

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const cardSwipeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: swipeX.value },
      { rotate: `${swipeRotation.value}deg` },
      { scale: cardScale.value },
    ],
    opacity: cardOpacity.value,
  }));

  const gradientPair =
    CARD_GRADIENT_COLORS[type] || CARD_GRADIENT_COLORS.normal;

  // Stickers
  const cardSticker = isAnimatedBg
    ? CARD_STICKER_GIFS[type] || normalSticker
    : normalSticker;
  const versusPickSticker = require("@/assets/emojis/two_cards.png");

  /** Tap on the dark overlay background to dismiss (same as tapping/swiping the card) */
  const handleOverlayPress = useCallback(() => {
    if (canDismissVal.value) {
      flyRightDismiss();
    }
  }, [canDismissVal, flyRightDismiss]);

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* Full-screen pressable backdrop — tap anywhere outside the card to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleOverlayPress} />
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.cardFlipWrapper, cardSwipeStyle]}>
          <Animated.View
            style={[
              styles.challengeCard,
              isVersus
                ? { backgroundColor: "rgba(28,28,30,0.97)" }
                : animatedBgStyle,
            ]}
          >
            {/* Gradient background — for versus: pre-mounted but invisible until pick */}
            {isAnimatedBg && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  isVersus && gradientOverlayStyle,
                ]}
              >
                {type === "golden" && Platform.OS === "ios" ? (
                  <MeshGradientView
                    style={StyleSheet.absoluteFill}
                    columns={MESH_COLUMNS}
                    rows={MESH_ROWS}
                    colors={meshColors}
                    points={meshPoints}
                    smoothsColors={true}
                    ignoresSafeArea={false}
                  />
                ) : (
                  <LinearGradient
                    colors={[gradientPair[0], gradientPair[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
              </Animated.View>
            )}

            {/* Card content */}
            <View
              style={{
                flex: 1,
                paddingTop: 52,
                paddingBottom: 48,
                paddingHorizontal: 28,
              }}
            >
              {/* Player badge — top right */}
              <View style={styles.playerBadgeTopRight}>
                <LinearGradient
                  colors={[playerColor + "28", playerColor + "10"]}
                  style={styles.playerBadgePill}
                >
                  <Image
                    source={
                      PLAYER_STICKERS[playerIndex % PLAYER_STICKERS.length]
                    }
                    style={styles.playerBadgeSticker}
                    contentFit="contain"
                  />
                  <Text style={styles.playerBadgeName}>{playerName}</Text>
                </LinearGradient>
              </View>

              {/* Main content */}
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                {isVersus && players ? (
                  /* ═══ VERSUS: both layers always mounted, crossfaded via shared values ═══ */
                  <View
                    style={{ flex: 1, width: "100%", justifyContent: "center" }}
                  >
                    {/* LAYER 1: Pick grid (visible initially, fades out on pick) */}
                    <Animated.View
                      style={[{ width: "100%" }, pickContentStyle]}
                      pointerEvents={vsOpponent ? "none" : "auto"}
                    >
                      <View style={{ alignItems: "center", marginBottom: 16 }}>
                        <Animated.View style={stickerParallaxStyle}>
                          <Image
                            source={versusPickSticker}
                            style={{ width: 110, height: 110 }}
                            contentFit="contain"
                          />
                        </Animated.View>
                      </View>
                      <Text style={[styles.cardText, { textAlign: "center" }]}>
                        {t('laOca.chooseRival')}
                      </Text>
                      <View style={[styles.pickGrid, { marginTop: 16 }]}>
                        {players.map((p: any, idx: number) => {
                          if (idx === (currentPlayer ?? 0)) return null;
                          const pColor =
                            PLAYER_COLORS[idx % PLAYER_COLORS.length];
                          return (
                            <Pressable
                              key={idx}
                              onPress={() => handlePickVersus(idx)}
                              style={({ pressed }) => [
                                {
                                  opacity: pressed ? 0.8 : 1,
                                  transform: [{ scale: pressed ? 0.92 : 1 }],
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.pickBubble,
                                  { backgroundColor: pColor + "12" },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.pickBubbleRing,
                                    { borderColor: pColor + "50" },
                                  ]}
                                >
                                  <Image
                                    source={
                                      PLAYER_STICKERS[
                                        idx % PLAYER_STICKERS.length
                                      ]
                                    }
                                    style={styles.pickSticker}
                                    contentFit="contain"
                                  />
                                </View>
                                <Text style={styles.pickName}>{p.name}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </Animated.View>

                    {/* LAYER 2: Challenge content (hidden initially, fades in on pick) — always mounted */}
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 20,
                        },
                        challengeContentStyle,
                      ]}
                      pointerEvents={vsOpponent ? "auto" : "none"}
                    >
                      <View style={{ marginTop: 0 }}>
                        <Animated.View style={stickerParallaxStyle}>
                          <Image
                            source={cardSticker}
                            style={{ width: 110, height: 110 }}
                            contentFit="contain"
                            autoplay
                          />
                        </Animated.View>
                      </View>
                      <View style={{ width: "100%" }}>
                        <View style={[styles.vsRow, { marginBottom: 16 }]}>
                          <View style={styles.vsPlayerSide}>
                            <Text style={styles.vsPlayerName}>
                              {playerName}
                            </Text>
                          </View>
                          <View style={styles.vsMiddle}>
                            <Image
                              source={require("@/assets/emojis/two_cards.png")}
                              style={styles.vsSticker}
                              contentFit="contain"
                            />
                            <Text style={styles.vsLabel}>{t('laOca.vs')}</Text>
                          </View>
                          <View style={styles.vsPlayerSide}>
                            <Text style={styles.vsPlayerName}>
                              {vsOpponent || " "}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.cardText, { textAlign: "center" }]}
                        >
                          {text}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>
                ) : (
                  /* ═══ NON-VERSUS: normal card layout ═══ */
                  <>
                    <View style={{ marginTop: 0 }}>
                      <Animated.View style={stickerParallaxStyle}>
                        <Image
                          source={cardSticker}
                          style={{ width: 110, height: 110 }}
                          contentFit="contain"
                          autoplay
                        />
                      </Animated.View>
                    </View>
                    <View style={{ width: "100%" }}>
                      <Text style={[styles.cardText, { textAlign: "center" }]}>
                        {text}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ─── Golden Tile ─────────────────────────────
function GoldenTile({
  tileLeft,
  tileTop,
  stickerSize,
  tileId,
}: {
  tileLeft: number;
  tileTop: number;
  stickerSize: number;
  tileId: number;
}) {
  const { points, colors } = useMeshAnimationState();
  return (
    <View
      style={[
        styles.tileOuter,
        {
          left: tileLeft,
          top: tileTop,
          width: _board.sqSize,
          height: _board.sqH,
          overflow: "hidden",
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: "rgba(255,214,10,0.45)",
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <MeshGradientView
          style={{ width: _board.sqSize, height: _board.sqH, position: "absolute" }}
          columns={MESH_COLUMNS}
          rows={MESH_ROWS}
          colors={colors}
          points={points}
          smoothsColors={true}
          ignoresSafeArea={false}
        />
      ) : (
        <LinearGradient
          colors={["rgba(255,214,10,0.75)", "rgba(255,159,10,0.35)"]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ position: "absolute", width: _board.sqSize, height: _board.sqH }}
        />
      )}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <Image
          source={require("@/assets/emojis/crown.png")}
          style={{
            width: stickerSize,
            height: stickerSize,
            transform: [{ rotate: `${((tileId * 7) % 17) - 8}deg` }],
          }}
          contentFit="contain"
        />
      </View>
      <Text style={[styles.tileNumBL, { zIndex: 3 }]}>{tileId + 1}</Text>
    </View>
  );
}

// ─── Board View ──────────────────────────────
function BoardView({
  positions,
  currentPlayer,
}: {
  positions: number[];
  currentPlayer: number;
}) {
  const { t } = useTranslation();
  const squares = useMemo(
    () =>
      Array.from({ length: _board.totalSquares }, (_, i) => ({
        id: i,
        ...getSquareXY(i),
        config: getSquareConfig(i),
      })),
    [_board],
  );

  const getTokenInfo = (playerIdx: number) => {
    const myPos = positions[playerIdx];
    let count = 0;
    let myIndex = 0;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] === myPos) {
        if (i === playerIdx) myIndex = count;
        count++;
      }
    }
    return { total: count, index: myIndex };
  };

  const activePos = positions[currentPlayer] ?? 0;
  const activeColor = PLAYER_COLORS[currentPlayer % PLAYER_COLORS.length];

  return (
    <View style={[styles.boardContainer, { height: _board.boardH }]}>
      <LinearGradient
        colors={["rgba(120,120,128,0.08)", "rgba(120,120,128,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.boardBg}
      />

      {squares.map((sq) => {
        const isStart = sq.id === 0;
        const isEnd = false;
        const isSpecial = sq.config.type !== "normal";
        const isActive = sq.id === activePos;
        const edges = _board.edges[sq.id];
        const gradientColors = isStart
          ? (["rgba(88,86,214,0.50)", "rgba(88,86,214,0.18)"] as [
              string,
              string,
            ])
          : TILE_GRADIENTS[sq.config.type];

        const baseRGB = isActive
          ? activeColor
              .match(/rgba?\(([^)]+)\)/)?.[1]
              ?.split(",")
              .slice(0, 3)
              .join(",") || "255,255,255"
          : isStart
            ? "88,86,214"
            : BG_TINTS[sq.config.type] || "142,142,147";

        const tileLeft = sq.x - _board.sqSize / 2;
        const tileTop = sq.y - _board.sqH / 2;
        const stickerSize = _board.sqSize * 0.58;

        if (sq.config.type === "golden") {
          return (
            <GoldenTile
              key={sq.id}
              tileLeft={tileLeft}
              tileTop={tileTop}
              stickerSize={stickerSize}
              tileId={sq.id}
            />
          );
        }

        return (
          <View
            key={sq.id}
            style={[
              styles.tileOuter,
              {
                left: tileLeft,
                top: tileTop,
                width: _board.sqSize,
                height: _board.sqH,
                overflow: "hidden",
                borderRadius: 8,
              },
            ]}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.tile}
            >
              <>
                {isStart ? (
                  <Image
                    source={require("@/assets/emojis/admission_tickets.png")}
                    style={styles.tileStickerCenter}
                    contentFit="contain"
                  />
                ) : isSpecial ? (
                  <Image
                    source={
                      SPECIAL_TILE_STICKERS[sq.config.type] ||
                      seededTileSticker(sq.id)
                    }
                    style={{
                      width: stickerSize,
                      height: stickerSize,
                      transform: [{ rotate: `${((sq.id * 7) % 17) - 8}deg` }],
                    }}
                    contentFit="contain"
                  />
                ) : null}
                <Text style={styles.tileNumBL}>{sq.id + 1}</Text>
              </>
            </LinearGradient>

            {/* Border walls on non-connected edges (path delimiter) */}
            {!edges.top && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2.5,
                  backgroundColor: `rgba(${baseRGB},0)`,
                  borderRadius: 1,
                }}
              />
            )}
            {!edges.right && (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 2.5,
                  backgroundColor: `rgba(${baseRGB},0)`,
                  borderRadius: 1,
                }}
              />
            )}
            {!edges.bottom && (
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2.5,
                  backgroundColor: `rgba(${baseRGB},0)`,
                  borderRadius: 1,
                }}
              />
            )}
            {!edges.left && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2.5,
                  backgroundColor: `rgba(${baseRGB},0)`,
                  borderRadius: 1,
                }}
              />
            )}
          </View>
        );
      })}

      {/* END ZONE (only for normal 8x8 board) */}
      {_board.cols === 8 && (() => {
        const cellW = _board.sqSize + SQUARE_GAP;
        const cellH = _board.sqH + SQUARE_GAP;
        // Bottom row positions
        const bottomLeft = BOARD_PADDING + 2 * cellW;
        const bottomTop = BOARD_PADDING + 4 * cellH;
        const bottomLeftW = _board.sqSize; // Single left tile
        const bottomRightLeft = BOARD_PADDING + 3 * cellW;
        const bottomRightW = 2 * _board.sqSize + SQUARE_GAP; // Two right tiles
        const bottomH = _board.sqH;
        // Top row positions
        const topLeft = BOARD_PADDING + 3 * cellW;
        const topTop = BOARD_PADDING + 3 * cellH;
        const topW = 2 * _board.sqSize + SQUARE_GAP;
        const topH = _board.sqH;
        // 2x2 right block center for END text
        const rightBlockTop = topTop;
        const rightBlockH = topH + SQUARE_GAP + bottomH;
        return (
          <>
            {/* Top section (2x1 squares, right side) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: topLeft,
                top: topTop,
                width: topW,
                height: topH,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderWidth: 1.5,
                borderBottomWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Bottom-right section (2x1 squares) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: bottomRightLeft,
                top: bottomTop,
                width: bottomRightW,
                height: bottomH,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 12,
                borderWidth: 1.5,
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Bottom-left section (1x1 square) */}
            <View
              style={{
                position: "absolute",
                left: bottomLeft,
                top: bottomTop,
                width: bottomLeftW,
                height: bottomH,
                backgroundColor: "rgb(69, 70, 71)",
                borderTopLeftRadius: 12,
                borderBottomLeftRadius: 12,
                borderWidth: 1.5,
                borderRightWidth: 0,
                borderTopWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Middle connector - vertical gap between top and bottom-right */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: topLeft,
                top: topTop + topH,
                width: topW,
                height: SQUARE_GAP,
                borderLeftWidth: 1.5,
                borderRightWidth: 1.5,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Horizontal connector - gap between bottom-left and bottom-right */}
            <View
              style={{
                position: "absolute",
                left: bottomLeft + bottomLeftW,
                top: bottomTop,
                width: SQUARE_GAP,
                height: bottomH,
                backgroundColor: "rgb(69, 70, 71)",
                borderTopWidth: 1.5,
                borderBottomWidth: 1.5,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Content overlay — centered on the 2x2 right block */}
            <View
              style={{
                position: "absolute",
                left: topLeft,
                top: rightBlockTop,
                width: topW,
                height: rightBlockH,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 3,
              }}
              pointerEvents="none"
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: 4,
                  fontFamily: "ui-rounded",
                }}
              >
                {t('laOca.end')}
              </Text>
            </View>
            {/* Number 60 in bottom left corner */}
            <Text
              style={{
                position: "absolute",
                top: bottomTop + bottomH - 14,
                left: bottomLeft + 4,
                fontSize: 10,
                fontWeight: "700",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "ui-rounded",
                zIndex: 3,
              }}
            >
              60
            </Text>
          </>
        );
      })()}

      {/* END ZONE (for PRO 10x10 board) */}
      {_board.cols === 10 && (() => {
        const cellW = _board.sqSize + SQUARE_GAP;
        const cellH = _board.sqH + SQUARE_GAP;
        // Empty cells form inverted-L:
        //   row3: cols 3-6 (4 wide)
        //   row4: cols 3-5 (3 wide)  — col6 has square 89
        //   row5: cols 3-5 (3 wide)  — col6 has square 88
        // Top-left section: cols 3-5, row 3
        const tlLeft = BOARD_PADDING + 3 * cellW;
        const tlTop = BOARD_PADDING + 3 * cellH;
        const tlW = 3 * _board.sqSize + 2 * SQUARE_GAP;
        const tlH = _board.sqH;
        // Top-right extension: col 6, row 3
        const trLeft = BOARD_PADDING + 6 * cellW;
        const trTop = BOARD_PADDING + 3 * cellH;
        const trW = _board.sqSize;
        const trH = _board.sqH;
        // Bottom block: cols 3-5, rows 4-5
        const btLeft = BOARD_PADDING + 3 * cellW;
        const btTop = BOARD_PADDING + 4 * cellH;
        const btW = 3 * _board.sqSize + 2 * SQUARE_GAP;
        const btH = 2 * _board.sqH + SQUARE_GAP;
        // Full left-block height for END text
        const fullH = tlH + SQUARE_GAP + btH;
        return (
          <>
            {/* Top-left section (3×1, cols 3-5, row 3) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: tlLeft,
                top: tlTop,
                width: tlW,
                height: tlH,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderWidth: 1.5,
                borderBottomWidth: 0,
                borderRightWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Top-right extension (col 6, row 3) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: trLeft,
                top: trTop,
                width: trW,
                height: trH,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 12,
                borderWidth: 1.5,
                borderLeftWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Horizontal connector (gap between top-left and top-right) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: tlLeft + tlW,
                top: tlTop,
                width: SQUARE_GAP,
                height: tlH,
                borderTopWidth: 1.5,
                borderBottomWidth: 1.5,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Bottom block (3×2, cols 3-5, rows 4-5) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: btLeft,
                top: btTop,
                width: btW,
                height: btH,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
                borderWidth: 1.5,
                borderTopWidth: 0,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* Vertical connector (gap between top-left and bottom block) */}
            <View
              style={{
                backgroundColor: "rgb(69, 70, 71)",
                position: "absolute",
                left: tlLeft,
                top: tlTop + tlH,
                width: tlW,
                height: SQUARE_GAP,
                borderLeftWidth: 1.5,
                borderRightWidth: 1.5,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 2,
              }}
            />
            {/* END text centered on 3×3 left block */}
            <View
              style={{
                position: "absolute",
                left: tlLeft,
                top: tlTop,
                width: tlW,
                height: fullH,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 3,
              }}
              pointerEvents="none"
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: 4,
                  fontFamily: "ui-rounded",
                }}
              >
                {t('laOca.end')}
              </Text>
            </View>
            {/* Number 91 in top-right extension */}
            <Text
              style={{
                position: "absolute",
                top: trTop + trH - 14,
                left: trLeft + 4,
                fontSize: 10,
                fontWeight: "700",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "ui-rounded",
                zIndex: 3,
              }}
            >
              91
            </Text>
          </>
        );
      })()}

      {positions.map((_, idx) => {
        const info = getTokenInfo(idx);
        return (
          <AnimatedToken
            key={idx}
            playerIndex={idx}
            position={positions[idx]}
            isActive={idx === currentPlayer}
            totalOnSquare={info.total}
            indexOnSquare={info.index}
            boardW={BOARD_WIDTH}
            boardH={_board.boardH}
          />
        );
      })}
    </View>
  );
}

// ─── Players Bar ─────────────────────────────
function PlayersBar({
  players,
  positions,
  currentPlayer,
}: {
  players: any[];
  positions: number[];
  currentPlayer: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.playersBarContent}
    >
      {players.map((player, idx) => {
        const isActive = idx === currentPlayer;
        const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
        return (
          <View key={idx} style={styles.playerBubble}>
            <View
              style={[
                styles.playerRing,
                isActive && { borderColor: color, borderWidth: 2.5 },
              ]}
            >
              <LinearGradient
                colors={
                  isActive
                    ? [color + "30", color + "08"]
                    : ["rgba(120,120,128,0.12)", "rgba(120,120,128,0.04)"]
                }
                style={styles.playerCircle}
              >
                <Image
                  source={PLAYER_STICKERS[idx % PLAYER_STICKERS.length]}
                  style={styles.playerSticker}
                  contentFit="contain"
                />
              </LinearGradient>
            </View>
            <Text
              style={[
                styles.playerName,
                isActive && { color: "#fff", fontWeight: "700" },
              ]}
            >
              {player.name}
            </Text>
            <Text style={styles.playerPos}>{positions[idx]}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Component ──────────────────────────
export function LaOcaGame() {
  const { state, dispatch, showPremiumUpsell } = useGameStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isPremium = state.isPremium;

  const [boardType, setBoardType] = useState<BoardType>("normal");
  // Set active board preset for all sub-components
  _board = BOARDS[boardType];

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [positions, setPositions] = useState<number[]>([]);
  const [diceDisabled, setDiceDisabled] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState("");
  const [currentConfig, setCurrentConfig] = useState<SquareConfig | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionsRef = useRef<number[]>([]);
  const currentPlayerRef = useRef(0);
  const isClosingCardRef = useRef(false);
  const diceGuardRef = useRef(false);
  const cardKeyRef = useRef(0);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  const players = state.players;

  useEffect(() => {
    if (players.length > 0 && positions.length === 0)
      setPositions(players.map(() => 0));
  }, [players]);

  const pickChallenge = (type: SquareType): string => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    switch (type) {
      case "drink":
        return pick(DRINK_CHALLENGES);
      case "chug":
        return pick(CHUG_CHALLENGES);
      case "versus":
        return pick(VERSUS_CHALLENGES);
      case "boost":
        return t('laOca.boostText');
      case "bomb":
        return t('laOca.bombText');
      case "golden":
        return pick(GOLDEN_CHALLENGES);
      default:
        return pick(NORMAL_CHALLENGES);
    }
  };

  const handleDiceRoll = useCallback(
    (value: number) => {
      // Double guard: ref for immediate protection + state for UI
      if (diceGuardRef.current || diceDisabled) return;
      diceGuardRef.current = true;
      setDiceDisabled(true);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      const currentPos = positions[currentPlayer];
      const newPos = Math.min(currentPos + value, _board.totalSquares - 1);
      const stepsCount = newPos - currentPos;
      setPositions((prev) => {
        const p = [...prev];
        p[currentPlayer] = newPos;
        return p;
      });

      const animDuration = stepsCount * 160 + 180;

      rollTimeoutRef.current = setTimeout(() => {
        rollTimeoutRef.current = null;
        if (newPos === _board.totalSquares - 1) {
          setPhase("finished");
          return;
        }
        const config = getSquareConfig(newPos);
        setCurrentConfig(config);
        setCurrentChallenge(pickChallenge(config.type));
        cardKeyRef.current += 1;
        setPhase("card");
      }, animDuration);
    },
    [currentPlayer, positions, diceDisabled],
  );

  const advanceToNextPlayer = useCallback(() => {
    setPhase("board");
    setCurrentPlayer((prev) => (prev + 1) % players.length);
    setDiceDisabled(false);
    diceGuardRef.current = false;
    setCurrentConfig(null);
    isClosingCardRef.current = false;
  }, [players.length]);

  const closeCard = useCallback(() => {
    // Prevent duplicate calls
    if (isClosingCardRef.current) return;
    isClosingCardRef.current = true;

    const config = currentConfig;
    const isBoost = config?.type === "boost";
    const isBomb = config?.type === "bomb";
    const hasExtraMove = isBoost || isBomb;
    const extraSteps = 3;
    const STEP_DURATION = 160;
    const cp = currentPlayerRef.current;

    // Immediately go to board — card is already flying out
    setPhase("board");

    // Non-boost/bomb: advance to next player immediately (no delay)
    if (!hasExtraMove) {
      advanceToNextPlayer();
      return;
    }

    // Boost / Bomb: move token then check for chain cards
    if (isBoost) {
      setPositions((prev) => {
        const p = [...prev];
        p[cp] = Math.min(p[cp] + extraSteps, _board.totalSquares - 1);
        return p;
      });
    } else if (isBomb) {
      setPositions((prev) => {
        const p = [...prev];
        p[cp] = Math.max(p[cp] - extraSteps, 0);
        return p;
      });
    }

    const extraAnimWait = extraSteps * STEP_DURATION + 180;

    setTimeout(() => {
      const latestPositions = positionsRef.current;
      const latestCp = currentPlayerRef.current;

      if (isBoost) {
        const boostedPos = latestPositions[latestCp] ?? 0;
        if (boostedPos >= _board.totalSquares - 1) {
          setPhase("finished");
          return;
        }
        const landConfig = getSquareConfig(boostedPos);
        if (
          landConfig.type !== "normal" &&
          landConfig.type !== "boost" &&
          landConfig.type !== "bomb"
        ) {
          setCurrentConfig(landConfig);
          setCurrentChallenge(pickChallenge(landConfig.type));
          isClosingCardRef.current = false;
          cardKeyRef.current += 1;
          setPhase("card");
          return;
        }
      } else if (isBomb) {
        const bombedPos = latestPositions[latestCp] ?? 0;
        const landConfig = getSquareConfig(bombedPos);
        if (
          landConfig.type !== "normal" &&
          landConfig.type !== "boost" &&
          landConfig.type !== "bomb"
        ) {
          setCurrentConfig(landConfig);
          setCurrentChallenge(pickChallenge(landConfig.type));
          isClosingCardRef.current = false;
          cardKeyRef.current += 1;
          setPhase("card");
          return;
        }
      }
      // Advance to next player after boost/bomb animation
      advanceToNextPlayer();
    }, extraAnimWait);
  }, [currentConfig, players.length, advanceToNextPlayer]);

  // Reset closing flag when entering card phase
  useEffect(() => {
    if (phase === "card") {
      isClosingCardRef.current = false;
    }
  }, [phase]);

  // Safety: re-enable dice if phase is "board" and stuck
  useEffect(() => {
    if (phase === "board" && diceDisabled && !rollTimeoutRef.current) {
      const safety = setTimeout(() => {
        diceGuardRef.current = false;
        setDiceDisabled(false);
      }, 500);
      return () => clearTimeout(safety);
    }
  }, [phase, diceDisabled]);

  const goBack = useCallback(() => router.back(), []);
  const playerName = players[currentPlayer]?.name || t('laOca.player');
  const playerColor = PLAYER_COLORS[currentPlayer % PLAYER_COLORS.length];

  const showBoard =
    phase === "board" || phase === "card" || phase === "finished";

  // ── INTRO ──
  const renderIntro = () => (
    <GameIntro
      title={t('laOca.introTitle')}
      subtitle={t('laOca.introSubtitle')}
      emoji={require("@/assets/emojis/table_game.png")}
      accentRgb="rgba(245,158,11,"
      accentColor={ACCENT}
      accentColorDark={ACCENT_DARK}
      videoSource={require("@/assets/games_preview/board_game.mp4")}
      rules={[
        { emoji: require("@/assets/emojis/game_dice.png"), text: t('laOca.rule1') },
        { emoji: require("@/assets/emojis/beer.png"), text: t('laOca.rule2') },
        { emoji: require("@/assets/emojis/two_cards.png"), text: t('laOca.rule3') },
        { emoji: require("@/assets/emojis/crown.png"), text: t('laOca.rule4') },
      ]}
      buttonLabel={t('common.play')}
      onPlay={() => {
        players.length >= 2 ? setPhase("board-type") : setPhase("setup");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onBack={goBack}
    />
  );

  const renderSetup = () => (
    <PlayerSetup
      minPlayers={2}
      maxPlayers={8}
      gameName={t('laOca.introTitle')}
      gameColor={ACCENT}
      onBack={goBack}
      onContinue={() => {
        setPositions(state.players.map(() => 0));
        setPhase("board-type");
      }}
    />
  );

  // ── BOARD TYPE SELECTOR ──
  const renderBoardType = () => {
    const selectBoard = (type: BoardType) => {
      // The 10x10 board is Pro-only, same gating as the "hot" categories.
      if (type === "pro" && !isPremium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showPremiumUpsell(t('games.unlockWithPremium'));
        return;
      }
      setBoardType(type);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Reset positions for the new board
      setPositions(state.players.length > 0 ? state.players.map(() => 0) : []);
      setCurrentPlayer(0);
      setDiceDisabled(false);
      diceGuardRef.current = false;
      setPhase("board");
    };

    return (
      <Animated.View entering={FadeIn.duration(350)} style={styles.phase}>
        <View
          style={[
            styles.boardTypeScreen,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={goBack} style={styles.headerBack} hitSlop={12}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{t('laOca.chooseYourBoard')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.boardTypeCards}>
            {/* Normal Board */}
            <Pressable
              onPress={() => selectBoard("normal")}
              style={({ pressed }) => [
                styles.boardTypeCard,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boardTypeGradient}
              >
                <Image
                  source={require("@/assets/emojis/table_game.png")}
                  style={{ width: 56, height: 56 }}
                  contentFit="contain"
                />
                <Text style={styles.boardTypeLabel}>{t('laOca.normalBoard')}</Text>
                <Text style={styles.boardTypeDesc}>
                  {t('laOca.normalBoardDesc', { count: BOARDS.normal.totalSquares })}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* PRO Board */}
            <Pressable
              onPress={() => selectBoard("pro")}
              style={({ pressed }) => [
                styles.boardTypeCard,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6", "#A855F7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boardTypeGradient}
              >
                <Image
                  source={require("@/assets/emojis/crown.png")}
                  style={{ width: 56, height: 56 }}
                  contentFit="contain"
                />
                <Text style={styles.boardTypeLabel}>{t('laOca.proBoard')}</Text>
                <Text style={styles.boardTypeDesc}>
                  {t('laOca.proBoardDesc', { count: BOARDS.pro.totalSquares })}
                </Text>
                <View style={styles.boardTypeProBadge}>
                  {!isPremium && <Ionicons name="lock-closed" size={12} color="#fff" />}
                  <Text style={styles.boardTypeProText}>{t('laOca.proBadge')}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderBoard = () => (
    <GestureHandlerRootView style={styles.phase}>
      <View
        style={[
          styles.boardScreen,
          { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 4 },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.headerBack} hitSlop={12}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
            <Text style={styles.headerTitle}>{t('laOca.introTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <PlayersBar
          players={players}
          positions={positions}
          currentPlayer={currentPlayer}
        />

        <View style={styles.boardWrapper}>
          <BoardView positions={positions} currentPlayer={currentPlayer} />
        </View>

        <RealDice
          onRollComplete={handleDiceRoll}
          disabled={diceDisabled}
          currentPlayerName={playerName}
          currentPlayerColor={playerColor}
        />
      </View>
    </GestureHandlerRootView>
  );

  const renderFinished = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.overlay}>
      <View style={styles.cardFlipWrapper}>
        <View
          style={[
            styles.challengeCard,
            {
              borderColor: "rgba(48,209,88,0.18)",
              paddingTop: 52,
              paddingBottom: 24,
              paddingHorizontal: 28,
            },
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(48,209,88,0.16)",
              "transparent",
              "rgba(48,209,88,0.08)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Group>
              <Blur blur={50} />
              <Circle cx={SCREEN_WIDTH * 0.35} cy={120} r={140}>
                <RadialGradient
                  c={vec(0, 0)}
                  r={140}
                  colors={["rgba(48,209,88,0.30)", "transparent"]}
                  positions={[0, 1]}
                />
              </Circle>
            </Group>
          </Canvas>

          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              zIndex: 2,
            }}
          >
            <LinearGradient
              colors={["rgba(48,209,88,0.30)", "rgba(48,209,88,0.06)"]}
              style={styles.finishedCircle}
            >
              <Image
                source={require("@/assets/emojis/crown.png")}
                style={styles.finishedCrown}
                contentFit="contain"
              />
            </LinearGradient>
            <Animated.Text
              entering={FadeInDown.delay(250).duration(450).springify()}
              style={styles.finishedTitle}
            >
              {t('laOca.wins', { name: playerName })}
            </Animated.Text>
            <Text style={styles.finishedSub}>{t('laOca.allDrinkInHonor')}</Text>
          </View>

          <View style={[styles.finishedBtns, { zIndex: 2 }]}>
            <Pressable
              onPress={() => {
                setPositions(players.map(() => 0));
                setCurrentPlayer(0);
                setDiceDisabled(false);
                setPhase("board");
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_DARK]}
                style={styles.mainBtn}
              >
                <Text style={styles.mainBtnText}>{t('common.playAgain')}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.exitText}>{t('common.exit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {phase === "intro" && renderIntro()}
      {phase === "setup" && renderSetup()}
      {phase === "board-type" && renderBoardType()}
      {showBoard && renderBoard()}
      {/* Challenge card (normal / special / versus with inline pick) */}
      {phase === "card" && currentConfig && (
        <ChallengeCard
          key={cardKeyRef.current}
          type={currentConfig.type}
          config={currentConfig}
          text={currentChallenge}
          playerName={playerName}
          playerColor={playerColor}
          playerIndex={currentPlayer}
          onDone={closeCard}
          players={currentConfig.type === "versus" ? players : undefined}
          currentPlayer={
            currentConfig.type === "versus" ? currentPlayer : undefined
          }
        />
      )}
      {phase === "finished" && renderFinished()}
    </View>
  );
}

// ─── Styles ──────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  phase: { flex: 1 },

  // Back button
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "300",
    marginTop: -2,
    marginLeft: -1,
  },

  // Intro
  introContent: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.primary,
  },
  introCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  introEmojiWrap: { marginBottom: 16 },
  introEmojiCircle: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#5856D6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  introEmoji: { width: 64, height: 64 },
  introTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  introSub: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 28,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  rulesCard: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  rulesInner: {
    padding: 22,
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(120,120,128,0.18)",
  },
  ruleRowWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleSticker: { width: 22, height: 22 },
  ruleRow: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  mainBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  mainBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // Board screen
  boardScreen: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: Colors.background.primary,
  },
  boardTypeScreen: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: Colors.background.primary,
  },
  boardTypeCards: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 10,
  },
  boardTypeCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  boardTypeGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  boardTypeLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  boardTypeDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    fontFamily: ROUNDED,
    textAlign: "center",
    lineHeight: 20,
  },
  boardTypeProBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  boardTypeProText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(120,120,128,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.3,
  },

  // Players bar
  playersBarContent: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
    height: 60,
  },
  playerBubble: { alignItems: "center", gap: 3 },
  playerRing: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1.5,
    borderColor: "rgba(120,120,128,0.18)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playerCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playerSticker: { width: 26, height: 26 },
  playerName: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
  },
  playerPos: { fontSize: 9, color: Colors.text.muted, fontFamily: ROUNDED },

  // Board
  boardWrapper: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  boardContainer: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    top: -180,
  },
  boardBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(84,84,88,0.18)",
  },

  // Tiles
  tileOuter: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  tile: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  tileStickerCenter: {
    width: SQUARE_SIZE * 0.48,
    height: SQUARE_SIZE * 0.48,
    marginTop: -2,
  },
  tileNumBL: {
    position: "absolute" as const,
    bottom: 2,
    left: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(235,235,245,0.3)",
    fontFamily: "ui-rounded",
  },

  // Tokens
  token: { position: "absolute", width: 32, height: 32, zIndex: 100 },
  tokenInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.primary,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  tokenImage: { width: 20, height: 20 },
  tokenGlow: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 99,
  },

  // Dice
  diceSection: { alignItems: "center", paddingVertical: 8, gap: 4 },
  turnIndicator: { flexDirection: "row", alignItems: "center", gap: 7 },
  turnDot: { width: 8, height: 8, borderRadius: 4 },
  turnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.secondary,
    fontFamily: ROUNDED,
  },
  dice: {
    width: 68,
    height: 68,
    borderRadius: 14,
    position: "relative",
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  diceDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1C1C1E",
  },
  diceHint: {
    fontSize: 11,
    color: Colors.text.muted,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.80)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    zIndex: 200,
  },

  // Challenge card
  cardFlipWrapper: { width: "100%" },
  challengeCard: {
    width: "100%",
    minHeight: 380,
    borderRadius: 28,
    backgroundColor: "rgba(28,28,30,0.97)",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 14 },
    }),
  },
  playerBadgeTopRight: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 3,
  },
  playerBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(120,120,128,0.18)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  playerBadgeSticker: { width: 16, height: 16 },
  playerBadgeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(235,235,245,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: ROUNDED,
  },
  cardText: {
    fontSize: 26,
    fontFamily: "ui-rounded",
    fontWeight: "700",
    color: "#fff",
    textAlign: "left",
    lineHeight: 35,
    letterSpacing: -0.3,
  },

  // VS layout
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 6,
    zIndex: 2,
  },
  vsPlayerSide: { alignItems: "center", flex: 1 },
  vsPlayerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    textAlign: "center",
  },
  vsMiddle: { alignItems: "center", gap: 2 },
  vsSticker: { width: 24, height: 24 },
  vsLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FF453A",
    letterSpacing: 3,
    fontFamily: ROUNDED,
  },

  // Versus pick
  pickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    zIndex: 2,
  },
  pickBubble: {
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 72,
    borderWidth: 1,
    borderColor: "rgba(120,120,128,0.18)",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  pickBubbleRing: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({ ios: { borderCurve: "continuous" as any } }),
  },
  pickSticker: { width: 24, height: 24 },
  pickName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    fontFamily: ROUNDED,
  },

  // Confetti
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "none",
  },

  // Finished
  finishedCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        borderCurve: "continuous" as any,
        shadowColor: "#30D158",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  finishedCrown: { width: 52, height: 52 },
  finishedTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    fontFamily: ROUNDED,
    letterSpacing: -0.5,
  },
  finishedSub: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
  finishedBtns: { marginTop: 16, gap: 12, width: "100%" },
  exitText: {
    fontSize: 15,
    color: Colors.text.muted,
    textAlign: "center",
    paddingVertical: 12,
    fontFamily: ROUNDED,
    fontWeight: "500",
  },
});

export default LaOcaGame;
