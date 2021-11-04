import { LINKS } from '@/utils/Constants';
import Image from '@/components/ui/Image';


function getBadgeShieldImageUrl(leftText: string, rightText: string, rightColor: string) {
    const urlPathnameParams = [ leftText, rightText, rightColor ]
        .map(encodeURIComponent)
        .join('-');
    const svgImgUrl = `${LINKS.BadgeShieldGenerator}/${urlPathnameParams}`;

    return svgImgUrl;
}


interface BadgeShieldProps {
    label: string;
    message: string;
    color: string;
    className?: string;
}

function BadgeShield({
    label = '',
    message = '',
    color = '',
    className = '',
}: BadgeShieldProps) {
    if (!label || !message || !color) {
        return null;
    }

    const badgeShieldImageUrl = getBadgeShieldImageUrl(label, message, color);

    return (
        <>
            <Image
                className={className}
                src={badgeShieldImageUrl}
                alt={`${label}-${message}`}
            />
        </>
    );
}

export default BadgeShield;
