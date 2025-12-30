Pod::Spec.new do |s|
  s.name           = 'CallDetection'
  s.version        = '1.0.0'
  s.summary        = 'Call detection module for Codex app'
  s.description    = 'Detects phone call states on iOS using CallKit'
  s.author         = 'Codex'
  s.homepage       = 'https://github.com/codex'
  s.platforms      = { :ios => '13.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  
  s.frameworks = 'CallKit'
end

