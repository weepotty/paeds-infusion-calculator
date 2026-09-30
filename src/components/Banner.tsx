type Props = { text: string }

export const Banner = ({ text }: Props) => (text === '' ? null : <div className="proto-banner">{text}</div>)
