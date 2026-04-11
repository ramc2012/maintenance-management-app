import Foundation

// Flexible JSON container used by several API-facing models.
struct AnyCodable: Codable, Hashable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map(\.value)
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues(\.value)
        } else if container.decodeNil() {
            value = Optional<Any>.none as Any
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported JSON value"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map(AnyCodable.init))
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues(AnyCodable.init))
        default:
            try container.encodeNil()
        }
    }

    static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        switch (lhs.value, rhs.value) {
        case let (l as Int, r as Int):
            return l == r
        case let (l as Double, r as Double):
            return l == r
        case let (l as Bool, r as Bool):
            return l == r
        case let (l as String, r as String):
            return l == r
        case let (l as [AnyCodable], r as [AnyCodable]):
            return l == r
        case let (l as [String: AnyCodable], r as [String: AnyCodable]):
            return l == r
        default:
            return false
        }
    }

    func hash(into hasher: inout Hasher) {
        switch value {
        case let intValue as Int:
            hasher.combine("int")
            hasher.combine(intValue)
        case let doubleValue as Double:
            hasher.combine("double")
            hasher.combine(doubleValue)
        case let boolValue as Bool:
            hasher.combine("bool")
            hasher.combine(boolValue)
        case let stringValue as String:
            hasher.combine("string")
            hasher.combine(stringValue)
        case let arrayValue as [AnyCodable]:
            hasher.combine("array")
            hasher.combine(arrayValue)
        case let dictValue as [String: AnyCodable]:
            hasher.combine("dict")
            for key in dictValue.keys.sorted() {
                hasher.combine(key)
                hasher.combine(dictValue[key])
            }
        default:
            hasher.combine("nil")
        }
    }
}
