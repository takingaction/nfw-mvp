'use client'

export default function MemberStories() {
  const stories = [
    {
      image: '/images/members/woman-1.jpg',
      name: 'Maria',
      location: 'Texas',
      challenge: 'Struggling with unexpected car repair',
      solution: 'Received $800 grant to fix transmission',
      bgColor: 'bg-[#d4f1ad]'
    },
    {
      image: '/images/members/woman-2.jpg',
      name: 'Lisa',
      location: 'Ohio',
      challenge: 'Behind on rent after medical bills',
      solution: 'Got $1,000 grant to cover housing',
      bgColor: 'bg-[#fdf493]'
    },
    {
      image: '/images/members/woman-3.jpg',
      name: 'Amy',
      location: 'California',
      challenge: 'Needed childcare to return to work',
      solution: 'Received $600 for two weeks of care',
      bgColor: 'bg-[#b2d1ee]'
    },
    {
      image: '/images/members/woman-4.jpg',
      name: 'Sarah',
      location: 'Florida',
      challenge: 'Groceries getting too expensive',
      solution: 'Saves $150/month with member perks',
      bgColor: 'bg-[#bcafcf]'
    }
  ]

  return (
    <div className="bg-white py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - UPDATED */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239]/10 rounded-full text-sm font-semibold text-[#2d1239] mb-4">
            Trusted by Women Across the Country
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#2d1239] mb-6 font-bold">
            From small towns to big cities,
            <br />
            <span className="text-[#2d1239]/60">we're here to help.</span>
          </h2>
          <p className="text-xl text-[#2d1239]/70 max-w-3xl mx-auto">
            Every member has a story. Here are just a few of the thousands we've supported nationwide.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stories.map((story, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              {/* Image */}
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-200">
                <img
                  src={story.image}
                  alt={`${story.name} from ${story.location}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${story.name}&size=400&background=random`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="mb-3">
                  <div className="text-2xl font-black font-bold">{story.name}</div>
                  <div className="text-sm text-white/80">{story.location}</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">→</span>
                    <span className="text-white/90">{story.challenge}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span className="text-white font-semibold">{story.solution}</span>
                  </div>
                </div>
              </div>

              <div className={`absolute top-0 left-0 right-0 h-2 ${story.bgColor}`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}