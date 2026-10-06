/**
 * PARTYUP UI Component Exports
 * =============================
 * Barrel exports for all UI components
 */

export { BrandName } from './BrandName';

export { Button } from './Button';
export type { ButtonSize, ButtonVariant } from './Button';

export { Card } from './Card';
export type { CardVariant } from './Card';

export { Avatar } from './Avatar';
export type { AvatarSize } from './Avatar';

export { Input } from './Input';
export type { InputVariant } from './Input';

export { Badge, BadgeWrapper } from './Badge';
export type { BadgeSize, BadgeVariant } from './Badge';

export { FloatingFooter } from './FloatingFooter';
export type { FloatingFooterProps } from './FloatingFooter';

// Re-export glass effect utilities
export { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';


export { RandomStickerLayout, default as StickerGif } from './StickerGif';

export { EmojiSticker, EmojiStickerStatic } from './EmojiSticker';

export { ProBadge } from './ProBadge';

export { SwipeToCreateButton } from './SwipeToCreateButton';

export { VenueHeroCard } from './VenueHeroCard';

export { ConnectionErrorScreen } from './ConnectionErrorScreen';

export { OfflineBanner } from './OfflineBanner';

// Skia Gradients - GPU accelerated (12 types + buttons)
export {
    AlbumGlowGradient,
    AppleMeshButton,
    AppleMeshGradient,
    AuroraGradient,
    CosmicDustGradient,
    GradientButton,
    LavaLampGradient,
    MeshBlobGradient,
    NeonCityGradient,
    OceanDeepGradient,
    SolidCirclesGradient,
    SunsetGlowGradient,
    SweepRainbowGradient,
    VinylHeatGradient
} from './SkiaGradients';

// Skia Gradients Extra - 10 Mesh Blur Variations + 10 Apple Buttons with Real Blur
export {
    AquaGlassButton,
    // 10 Apple Buttons with Real Skia Blur
    BumpPrimaryButton, BumpStyleMesh, CloudButton, CloudSoftMesh, CosmicIceMesh, CrispActionButton, CrispEdgeMesh,
    DualBlurMesh, GradientLayersMesh, HolographicButton, HolographicMesh, MetalButton, MetalLiquidMesh, NeonEdgeButton, PremiumXLButton, SharpAccentMesh,
    // 10 Mesh Gradients (Blur Variations)
    SoftAquaMesh, SoftPillButton, SunsetGlowButton
} from './SkiaGradientsExtra';

