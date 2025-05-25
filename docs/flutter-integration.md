# Flutter Integration Guide

## Setup

### 1. Dependencies
Add these to your `pubspec.yaml`:
```yaml
dependencies:
  dio: ^5.4.0
  socket_io_client: ^2.0.3+1
  json_annotation: ^4.8.1
  freezed_annotation: ^2.4.1

dev_dependencies:
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
  freezed: ^2.4.6
```

### 2. API Configuration
Create `lib/config/api_config.dart`:
```dart
class ApiConfig {
  static const String baseUrl = 'https://talksy-backend-z1ta.onrender.com/api';
  static const String wsUrl = 'wss://talksy-backend-z1ta.onrender.com';
  
  static const Map<String, String> headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
```

## Models

### 1. User Model
Create `lib/models/user.dart`:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String uid,
    required String displayName,
    required String email,
    String? photoUrl,
    String? bio,
    String? phoneNumber,
    String? countryCode,
    Address? address,
    SocialLinks? socialLinks,
    DateTime? dateOfBirth,
    String? gender,
    String? language,
    String? timezone,
    PrivacySettings? privacySettings,
    bool? isOnline,
    DateTime? lastSeen,
    List<String>? friends,
    Status? status,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
class Address with _$Address {
  const factory Address({
    String? street,
    String? city,
    String? state,
    String? country,
    String? postalCode,
  }) = _Address;

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);
}

@freezed
class SocialLinks with _$SocialLinks {
  const factory SocialLinks({
    String? facebook,
    String? twitter,
    String? instagram,
    String? linkedin,
    String? website,
  }) = _SocialLinks;

  factory SocialLinks.fromJson(Map<String, dynamic> json) => _$SocialLinksFromJson(json);
}

@freezed
class PrivacySettings with _$PrivacySettings {
  const factory PrivacySettings({
    @Default(false) bool showPhoneNumber,
    @Default(false) bool showEmail,
    @Default(false) bool showAddress,
    @Default(false) bool showSocialLinks,
  }) = _PrivacySettings;

  factory PrivacySettings.fromJson(Map<String, dynamic> json) => _$PrivacySettingsFromJson(json);
}
```

### 2. Chat Model
Create `lib/models/chat.dart`:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat.freezed.dart';
part 'chat.g.dart';

@freezed
class Chat with _$Chat {
  const factory Chat({
    required String id,
    required String type,
    required List<String> participants,
    String? name,
    String? adminId,
    List<Message>? messages,
    Message? lastMessage,
    Map<String, int>? unreadCounts,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Chat;

  factory Chat.fromJson(Map<String, dynamic> json) => _$ChatFromJson(json);
}

@freezed
class Message with _$Message {
  const factory Message({
    required String id,
    required String senderId,
    required String content,
    required String type,
    Map<String, dynamic>? metadata,
    List<Reaction>? reactions,
    bool? isRead,
    DateTime? readAt,
    DateTime? createdAt,
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
}

@freezed
class Reaction with _$Reaction {
  const factory Reaction({
    required String userId,
    required String emoji,
    required DateTime createdAt,
  }) = _Reaction;

  factory Reaction.fromJson(Map<String, dynamic> json) => _$ReactionFromJson(json);
}
```

### 3. Status Model
Create `lib/models/status.dart`:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'status.freezed.dart';
part 'status.g.dart';

@freezed
class Status with _$Status {
  const factory Status({
    required String id,
    required String userId,
    String? text,
    String? mediaUrl,
    String? mediaType,
    List<Reaction>? reactions,
    List<Comment>? comments,
    int? viewCount,
    Map<String, int>? reactionCounts,
    DateTime? expiresAt,
    DateTime? createdAt,
  }) = _Status;

  factory Status.fromJson(Map<String, dynamic> json) => _$StatusFromJson(json);
}

@freezed
class Comment with _$Comment {
  const factory Comment({
    required String id,
    required String userId,
    required String text,
    List<String>? mentions,
    DateTime? createdAt,
  }) = _Comment;

  factory Comment.fromJson(Map<String, dynamic> json) => _$CommentFromJson(json);
}
```

## API Services

### 1. Base API Service
Create `lib/services/api_service.dart`:
```dart
import 'package:dio/dio.dart';
import '../config/api_config.dart';

class ApiService {
  final Dio _dio;

  ApiService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    headers: ApiConfig.headers,
  ));

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }
}
```

### 2. User Service
Create `lib/services/user_service.dart`:
```dart
import '../models/user.dart';
import 'api_service.dart';

class UserService {
  final ApiService _apiService;

  UserService(this._apiService);

  Future<User> getProfile(String userId) async {
    final response = await _apiService.get('/users/$userId/profile');
    return User.fromJson(response.data['profile']);
  }

  Future<User> updateContactInfo(String userId, Map<String, dynamic> contactData) async {
    final response = await _apiService.put('/users/$userId/contact', data: contactData);
    return User.fromJson(response.data['user']);
  }

  Future<Map<String, dynamic>> updatePrivacySettings(
    String userId, 
    Map<String, dynamic> settings
  ) async {
    final response = await _apiService.put('/users/$userId/privacy', data: settings);
    return response.data['privacySettings'];
  }

  Future<bool> verifyPhone(String userId, String phoneNumber, String code) async {
    final response = await _apiService.post(
      '/users/$userId/verify-phone',
      data: {'phoneNumber': phoneNumber, 'verificationCode': code},
    );
    return response.data['success'];
  }

  Future<List<User>> searchByPhone(String phoneNumber) async {
    final response = await _apiService.get(
      '/users/search/phone',
      queryParameters: {'phoneNumber': phoneNumber},
    );
    return (response.data['users'] as List)
        .map((user) => User.fromJson(user))
        .toList();
  }
}
```

### 3. Chat Service
Create `lib/services/chat_service.dart`:
```dart
import '../models/chat.dart';
import 'api_service.dart';

class ChatService {
  final ApiService _apiService;

  ChatService(this._apiService);

  Future<Chat> createChat(Map<String, dynamic> chatData) async {
    final response = await _apiService.post('/chat', data: chatData);
    return Chat.fromJson(response.data);
  }

  Future<List<Chat>> getUserChats(String userId) async {
    final response = await _apiService.get('/chat/user/$userId');
    return (response.data as List)
        .map((chat) => Chat.fromJson(chat))
        .toList();
  }

  Future<Message> sendMessage(String chatId, Map<String, dynamic> messageData) async {
    final response = await _apiService.post(
      '/chat/$chatId/messages',
      data: messageData,
    );
    return Message.fromJson(response.data);
  }

  Future<List<Message>> getMessages(
    String chatId, {
    int? limit,
    DateTime? before,
    DateTime? after,
  }) async {
    final response = await _apiService.get(
      '/chat/$chatId/messages',
      queryParameters: {
        if (limit != null) 'limit': limit,
        if (before != null) 'before': before.toIso8601String(),
        if (after != null) 'after': after.toIso8601String(),
      },
    );
    return (response.data as List)
        .map((message) => Message.fromJson(message))
        .toList();
  }
}
```

## WebSocket Integration

### 1. Socket Service
Create `lib/services/socket_service.dart`:
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/api_config.dart';

class SocketService {
  late IO.Socket socket;

  void connect(String userId) {
    socket = IO.io(ApiConfig.wsUrl, <String, dynamic>{
      'transports': ['websocket'],
      'query': {'userId': userId},
    });

    socket.onConnect((_) {
      print('Connected to WebSocket');
    });

    socket.onDisconnect((_) {
      print('Disconnected from WebSocket');
    });

    // User Events
    socket.on('user:status', (data) {
      // Handle user status updates
    });

    socket.on('user:profile:updated', (data) {
      // Handle profile updates
    });

    // Chat Events
    socket.on('chat:message:new', (data) {
      // Handle new messages
    });

    socket.on('chat:typing', (data) {
      // Handle typing indicators
    });

    // Status Events
    socket.on('status:new', (data) {
      // Handle new status
    });

    socket.on('status:reaction', (data) {
      // Handle status reactions
    });
  }

  void disconnect() {
    socket.disconnect();
  }

  void joinChat(String chatId) {
    socket.emit('chat:join', {'chatId': chatId});
  }

  void leaveChat(String chatId) {
    socket.emit('chat:leave', {'chatId': chatId});
  }

  void sendTypingIndicator(String chatId, bool isTyping) {
    socket.emit('chat:typing', {
      'chatId': chatId,
      'isTyping': isTyping,
    });
  }
}
```

## Usage Example

### 1. Initialize Services
```dart
void main() {
  final apiService = ApiService();
  final userService = UserService(apiService);
  final chatService = ChatService(apiService);
  final socketService = SocketService();

  // Connect to WebSocket
  socketService.connect('user123');
}
```

### 2. User Profile Management
```dart
class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UserService _userService = UserService(ApiService());
  User? _user;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final user = await _userService.getProfile('user123');
      setState(() => _user = user);
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _updateContactInfo() async {
    try {
      final updatedUser = await _userService.updateContactInfo('user123', {
        'phoneNumber': '+1234567890',
        'countryCode': '+1',
      });
      setState(() => _user = updatedUser);
    } catch (e) {
      // Handle error
    }
  }
}
```

### 3. Chat Implementation
```dart
class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService(ApiService());
  final SocketService _socketService = SocketService();
  List<Message> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _socketService.joinChat('chat123');
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await _chatService.getMessages('chat123');
      setState(() => _messages = messages);
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _sendMessage(String content) async {
    try {
      final message = await _chatService.sendMessage('chat123', {
        'senderId': 'user123',
        'content': content,
        'type': 'text',
      });
      setState(() => _messages.add(message));
    } catch (e) {
      // Handle error
    }
  }
}
```

## Best Practices

1. **Error Handling**
   - Implement proper error handling for all API calls
   - Use try-catch blocks
   - Show user-friendly error messages

2. **State Management**
   - Use Provider, Bloc, or Riverpod for state management
   - Keep UI and business logic separate
   - Implement proper loading states

3. **Caching**
   - Cache user data locally
   - Implement offline support
   - Use proper cache invalidation

4. **Performance**
   - Implement pagination for lists
   - Use proper image caching
   - Optimize WebSocket connections

5. **Security**
   - Store sensitive data securely
   - Implement proper authentication
   - Handle token refresh 