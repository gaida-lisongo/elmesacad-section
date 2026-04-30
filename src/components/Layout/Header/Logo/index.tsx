import Image from 'next/image';
import Link from 'next/link';

const Logo: React.FC = () => {

  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/images/inbtp/png/img-2.png"
        alt="INBTP"
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        quality={100}
      />
      <span className="text-sm font-semibold text-midnight_text dark:text-white">
        INBTP
      </span>
    </Link>
  );
};

export default Logo;
