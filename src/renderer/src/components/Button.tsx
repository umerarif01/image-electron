interface ButtonProps {
  color: 'black' | 'white'
  className?: string
  children: React.ReactNode
  onClick?: () => void
  disabled: boolean
}

const Button = ({ color, className, children, onClick, disabled }: ButtonProps) => {
  const baseStyles = `
    h-10 
    ${color === 'black' ? 'bg-black text-white hover:bg-black/80' : 'bg-white text-black hover:bg-gray-100/80'} 
    border 
    border-slate-200 
    rounded 
    px-4 
    py-2 
    text-sm font-medium
    inline-flex items-center justify-center whitespace-nowrap
  `

  return (
    <button className={`${baseStyles} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export default Button
