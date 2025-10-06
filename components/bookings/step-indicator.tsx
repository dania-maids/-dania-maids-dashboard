import { Check } from "lucide-react"

interface Step {
  number: number
  title: string
  description: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full px-8 mb-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Background connecting lines */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" style={{ marginLeft: '5%', marginRight: '5%' }} />
          
          {/* Progress lines */}
          {steps.map((step, index) => (
            index < steps.length - 1 && currentStep > step.number && (
              <div
                key={`line-${index}`}
                className="absolute top-5 h-0.5 bg-green-600 z-0"
                style={{
                  left: `${(100 / (steps.length - 1)) * index + 5}%`,
                  width: `${100 / (steps.length - 1) - 10}%`
                }}
              />
            )
          ))}

          {/* Steps */}
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center relative z-10">
              {/* Circle */}
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${currentStep > step.number
                    ? 'bg-green-600 border-green-600 text-white'
                    : currentStep === step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                  }
                `}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step.number}</span>
                )}
              </div>
              
              {/* Text */}
              <div className="mt-3 text-center">
                <div className={`text-sm font-semibold ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}