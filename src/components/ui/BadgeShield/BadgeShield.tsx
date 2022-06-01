import { LINKS } from '@/utils/Constants';
import Image from '@/components/ui/Image';

import type { InferPropTypes } from '@/types';


function getBadgeShieldImageUrl(leftText: string, rightText: string, rightColor: string) {
    const urlPathnameParams = [ leftText, rightText, rightColor ]
        .map(encodeURIComponent)
        .join('-');
    const svgImgUrl = `${LINKS.BadgeShieldGenerator}/${urlPathnameParams}`;

    return svgImgUrl;
}


// Segment type declarations for better IDE quick-documentation
type ImagePropTypesInitial = InferPropTypes<typeof Image.propTypes>;
type ImagePropTypes = Omit<ImagePropTypesInitial, 'src' | 'className' | 'updateAppContext'>

export interface BadgeShieldProps {
    label: string;
    message: string;
    color: string;
    className?: string;
    imageProps?: Partial<ImagePropTypes>;
}

function BadgeShield({
    label = '',
    message = '',
    color = '',
    className = '',
    imageProps = {},
}: BadgeShieldProps) {
    if (!label || !message || !color) {
        return null;
    }

    const badgeShieldImageUrl = getBadgeShieldImageUrl(label, message, color);

    return (
        <>
            <Image
                alt={`shield-${label}-${message}`}
                {...imageProps} // Only allow `alt` to be overridden
                className={className}
                src={badgeShieldImageUrl}
            />
        </>
    );
}

export default BadgeShield;
